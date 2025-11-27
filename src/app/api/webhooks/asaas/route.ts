// src/app/api/webhooks/asaas/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/lib/firebase/admin';
import * as crypto from 'crypto';
import { headers } from 'next/headers';
import { updateUserSubscriptionAction } from '@/app/actions/billing-actions';

export const dynamic = 'force-dynamic';

const ASAAS_WEBHOOK_SECRET = process.env.ASAAS_WEBHOOK_SECRET;

async function saveWebhookLog(payload: any, status: 'SUCCESS' | 'FAILURE', details: string) {
    try {
        const logData = {
            payload: payload || { info: 'Payload not available' },
            status: status,
            details: details,
            createdAt: new Date(),
        };
        await db.collection('webhook_logs').add(logData);
    } catch (logError: any) => {
        console.error("CRITICAL: Failed to save webhook log.", logError.message);
    }
}

function verifyAsaasSignature(rawBody: string, signatureFromHeader: string): boolean {
  if (!ASAAS_WEBHOOK_SECRET) {
    console.error("Asaas webhook secret is not configured.");
    return false;
  }
  try {
    const expectedSig = crypto
      .createHmac("sha256", ASAAS_WEBHOOK_SECRET)
      .update(rawBody)
      .digest("hex");

    return expectedSig === signatureFromHeader;
  } catch (error) {
    console.error("Error during Asaas signature verification:", error);
    return false;
  }
}

async function handlePayment(event: any) {
    const eventName = event?.event;
    if (!eventName) {
        await saveWebhookLog(event, 'SUCCESS', 'Evento ignorado: campo "event" ausente no payload.');
        console.log('Webhook recebido, mas ignorado por não conter o campo "event".');
        return; // Não é um erro, apenas ignoramos.
    }

    const successfulPaymentEvents = ['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED'];
    if (!successfulPaymentEvents.includes(eventName)) {
        const message = `Evento não processado: ${eventName}`;
        await saveWebhookLog(event, 'SUCCESS', message); // Log as success because we correctly ignored it
        console.log(message);
        return; // Not an error, just an event we don't need to process.
    }

    const paymentData = event.payment;
    if (!paymentData) {
        const message = `Evento ${eventName} ignorado: payload não contém o objeto 'payment'.`;
        await saveWebhookLog(event, 'SUCCESS', message);
        console.log(message);
        return;
    }
    
    const metadata = paymentData?.metadata;
    const userId = metadata?.userId || paymentData?.externalReference;
    const planName = metadata?.plan;
    const billingCycle = metadata?.billingCycle;
    
    if (userId && planName && billingCycle) {
        try {
            const updateResult = await updateUserSubscriptionAction(userId, planName, billingCycle);
            if (updateResult.success) {
                await saveWebhookLog(event, 'SUCCESS', updateResult.message);
            } else {
                // This is a business logic failure, should be logged as such but not cause a 500 error to Asaas
                await saveWebhookLog(event, 'FAILURE', updateResult.message);
                console.error(`Falha na lógica de negócio ao processar webhook: ${updateResult.message}`);
            }
        } catch (dbError: any) {
            const errorMessage = `Falha ao atualizar usuário ${userId} via Server Action: ${dbError.message}`;
            console.error(errorMessage);
            await saveWebhookLog(event, 'FAILURE', errorMessage);
            // We don't rethrow here to avoid sending a 500 status to Asaas. We've logged it, that's enough.
        }
    } else {
        const message = 'Webhook de pagamento recebido, mas metadados cruciais (userId, plan ou billingCycle) não encontrados. O processamento foi ignorado.';
        console.warn(message, { payload: event });
        await saveWebhookLog(event, 'SUCCESS', message); // Logged as SUCCESS because we received it correctly, just couldn't process.
    }
}

export async function POST(request: NextRequest) {
  let rawBody;
  let event;
  try {
    rawBody = await request.text();
    event = JSON.parse(rawBody);
  } catch (error: any) {
      const errorMessage = `Erro fatal ao fazer parse do corpo do webhook: ${error.message}`;
      console.error(errorMessage);
      await saveWebhookLog({body: rawBody}, 'FAILURE', errorMessage);
      return new NextResponse('Payload malformado.', { status: 400 });
  }

  // Only verify signature if a secret is provided.
  if (process.env.ASAAS_WEBHOOK_SECRET) {
    const headerPayload = headers();
    const signature = headerPayload.get('asaas-webhook-signature');
    
    if (!signature) {
       const msg = 'Requisição de webhook do Asaas recebida sem assinatura no cabeçalho.';
       console.warn(msg);
       await saveWebhookLog(event, 'FAILURE', msg);
       return new NextResponse('Assinatura do webhook ausente.', { status: 403 });
    }

    const isSignatureValid = verifyAsaasSignature(rawBody, signature);
    if (!isSignatureValid) {
        const msg = 'Assinatura de webhook do Asaas inválida recebida.';
        console.warn(msg);
        await saveWebhookLog(event, 'FAILURE', msg);
        return new NextResponse('Assinatura do webhook inválida.', { status: 403 });
    }
  } else {
    console.log("INFO: Nenhuma variável ASAAS_WEBHOOK_SECRET configurada. Pulando verificação de assinatura.");
  }
    
  try {
      // Process the payment logic without blocking the response.
      // We don't await this, so we can immediately return a 200 OK to Asaas.
      handlePayment(event);
      
      // Asaas expects a 200 OK to confirm receipt.
      return NextResponse.json({ message: "Webhook recebido com sucesso e agendado para processamento." }, { status: 200 });

  } catch (error: any) {
      // This catch block is a fallback, but the logic inside handlePayment should prevent it.
      console.error("Erro inesperado no handler do webhook:", error);
      // We still return 200 OK because we've received it, even if processing failed.
      // The error is logged internally.
      return NextResponse.json({ message: "Webhook recebido, mas ocorreu um erro interno no processamento." }, { status: 200 });
  }
}

export async function GET() {
    return NextResponse.json({ message: 'Endpoint de webhook do Asaas. Use POST para enviar dados.' }, { status: 200 });
}
