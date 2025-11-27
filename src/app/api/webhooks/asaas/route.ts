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
    // Asaas sends various payment events. We are interested when the payment is confirmed.
    // PAYMENT_RECEIVED is a common status for confirmed PIX payments.
    if (event.event !== 'PAYMENT_RECEIVED') {
        const message = `Evento não processado: ${event.event || 'desconhecido'}`;
        console.log(message);
        return; // Not an error, just an event we don't need to process.
    }

    const paymentData = event.payment;
    if (!paymentData) {
        throw new Error("Payload do webhook não contém o objeto 'payment'.");
    }
    
    // Metadata is the most reliable way to get our internal IDs.
    const metadata = paymentData?.metadata;
    const userId = metadata?.userId || paymentData?.externalReference;
    const planName = metadata?.plan;
    const billingCycle = metadata?.billingCycle;
    
    if (userId && planName && billingCycle) {
        try {
            // Use the centralized server action to update the user's subscription
            const updateResult = await updateUserSubscriptionAction(userId, planName, billingCycle);
            if (updateResult.success) {
                await saveWebhookLog(event, 'SUCCESS', updateResult.message);
            } else {
                throw new Error(updateResult.message);
            }
        } catch (dbError: any) {
            const errorMessage = `Falha ao atualizar usuário ${userId} via Server Action: ${dbError.message}`;
            console.error(errorMessage);
            await saveWebhookLog(event, 'FAILURE', errorMessage);
            throw new Error(errorMessage);
        }
    } else {
        const message = 'Metadados cruciais (userId, plan ou billingCycle) não encontrados no payload do webhook do Asaas.';
        console.warn(message, { payload: event });
        await saveWebhookLog(event, 'FAILURE', message);
        // We throw an error so the webhook provider knows the processing failed.
        throw new Error(message);
    }
}

export async function POST(request: NextRequest) {
  let rawBody;
  let event;
  try {
    rawBody = await request.text();
    event = JSON.parse(rawBody);
  } catch (error: any) {
      console.error('Erro fatal ao fazer parse do corpo do webhook:', error.message);
      return new NextResponse('Payload malformado.', { status: 400 });
  }

  const headerPayload = headers();
  const signature = headerPayload.get('asaas-webhook-signature');
  
  if (!signature) {
     console.warn('Requisição de webhook do Asaas recebida sem assinatura no cabeçalho.');
     return new NextResponse('Assinatura do webhook ausente.', { status: 400 });
  }

  // Only verify signature if a secret is provided (for local testing without ngrok/tunnels)
  if (ASAAS_WEBHOOK_SECRET) {
    const isSignatureValid = verifyAsaasSignature(rawBody, signature);
    if (!isSignatureValid) {
        console.warn('Assinatura de webhook do Asaas inválida recebida.');
        await saveWebhookLog(event, 'FAILURE', 'Assinatura HMAC inválida.');
        return new NextResponse('Assinatura do webhook inválida.', { status: 403 });
    }
  }
    
  try {
      await handlePayment(event);
      // Asaas expects a 200 OK to confirm receipt.
      return NextResponse.json({ received: true }, { status: 200 });
  } catch (error: any) {
      // If handlePayment throws an error, it means something went wrong in our business logic.
      // We should return a server error status to let Asaas know they should retry.
      console.error("Erro no processamento do webhook em segundo plano:", error);
      return new NextResponse('Erro interno ao processar o webhook.', { status: 500 });
  }
}

export async function GET() {
    return NextResponse.json({ message: 'Endpoint de webhook do Asaas. Use POST para enviar dados.' }, { status: 200 });
}
