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
    } catch (logError: any) {
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
        const message = 'Evento ignorado: campo "event" ausente no payload.';
        await saveWebhookLog(event, 'SUCCESS', message);
        console.log(message);
        return;
    }

    const successfulPaymentEvents = ['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED'];
    if (!successfulPaymentEvents.includes(eventName)) {
        const message = `Evento não processado: ${eventName}`;
        await saveWebhookLog(event, 'SUCCESS', message); // Log as success because we correctly ignored it
        console.log(message);
        return;
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
                await saveWebhookLog(event, 'FAILURE', updateResult.message);
                console.error(`Falha na lógica de negócio ao processar webhook: ${updateResult.message}`);
            }
        } catch (dbError: any) {
            const errorMessage = `Falha ao atualizar usuário ${userId} via Server Action: ${dbError.message}`;
            console.error(errorMessage);
            await saveWebhookLog(event, 'FAILURE', errorMessage);
        }
    } else {
        const message = 'Webhook de pagamento recebido, mas metadados cruciais (userId, plan ou billingCycle) não encontrados. O processamento foi ignorado.';
        console.warn(message, { payload: event });
        await saveWebhookLog(event, 'SUCCESS', message);
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
    
  handlePayment(event);
      
  return NextResponse.json({ message: "Webhook recebido com sucesso." }, { status: 200 });
}

export async function GET() {
    return NextResponse.json({ message: 'Endpoint de webhook do Asaas. Use POST para enviar dados.' }, { status: 200 });
}
