// src/app/api/webhooks/abacatepay/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/lib/firebase/admin';
import * as crypto from 'crypto';

async function saveWebhookLog(payload: any, status: 'SUCCESS' | 'FAILURE', details: string) {
    try {
        const logData = {
            payload: payload,
            status: status,
            details: details,
            createdAt: new Date(),
        };
        // This is a fire-and-forget operation, we don't await it to respond quickly
        db.collection('webhook_logs').add(logData);
    } catch (logError) {
        console.error("CRITICAL: Failed to save webhook log.", logError);
    }
}

async function handlePayment(event: any) {
    if (event.event === 'billing.paid' && event.data?.pixQrCode) {
      const charge = event.data.pixQrCode;
      const metadata = charge.metadata;

      if (metadata && metadata.externalId && metadata.plan) {
        const userId = metadata.externalId;
        const planName = metadata.plan;
        const userRef = db.collection('users').doc(userId);

        let newSubscriptionStatus: 'premium' | 'professional' | 'free' = 'free';

        if (planName === 'PREMIUM') {
            newSubscriptionStatus = 'premium';
        } else if (planName === 'PROFISSIONAL') {
            newSubscriptionStatus = 'professional';
        } else {
          const message = `Plano desconhecido "${planName}" no webhook para o usuário ${userId}.`;
          console.warn(message);
          await saveWebhookLog(event, 'FAILURE', message);
          return; // Stop processing
        }

        await userRef.update({
          subscriptionStatus: newSubscriptionStatus,
        });

        const successMessage = `Assinatura do usuário ${userId} atualizada para ${newSubscriptionStatus}.`;
        console.log(successMessage);
        await saveWebhookLog(event, 'SUCCESS', successMessage);

      } else {
        const message = 'Metadados ausentes no webhook (externalId ou plan).';
        console.warn(message, metadata);
        await saveWebhookLog(event, 'FAILURE', message);
      }
    } else {
        const message = `Evento não processado: ${event.event}`;
        await saveWebhookLog(event, 'SUCCESS', message); // Success because we received it, even if not processed
    }
}

export async function POST(request: NextRequest) {
  let rawBody;
  try {
    rawBody = await request.text();
    const event = JSON.parse(rawBody);
    
    const signature = request.headers.get('abacate-signature');
    const webhookSecret = process.env.ABACATE_PAY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error('ABACATE_PAY_WEBHOOK_SECRET não está configurado.');
      // Don't save log here because we can't even validate
      return NextResponse.json({ error: 'Configuração de segurança do servidor incompleta.' }, { status: 500 });
    }

    if (!signature) {
      // Don't save log, request is invalid
      return NextResponse.json({ error: 'Assinatura do webhook ausente.' }, { status: 400 });
    }

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    if (signature !== expectedSignature) {
      console.warn('Assinatura de webhook inválida recebida.');
      // Don't save log, request is forged
      return NextResponse.json({ error: 'Assinatura do webhook inválida.' }, { status: 403 });
    }
    
    // --- Assinatura validada ---
    // Responda imediatamente para evitar timeout do AbacatePay
    // O processamento real acontece em segundo plano (fire-and-forget)
    handlePayment(event).catch(err => {
      console.error("Erro no processamento do webhook em segundo plano:", err);
      saveWebhookLog(event, 'FAILURE', err.message || 'Erro desconhecido no processamento em segundo plano.');
    });

    // Return a 200 OK response immediately
    return NextResponse.json({ received: true }, { status: 200 });

  } catch (error: any) {
    console.error('Erro ao processar o webhook do AbacatePay:', error);
    let payloadForLog = {};
    try {
        if(rawBody) payloadForLog = JSON.parse(rawBody);
    } catch {}
    
    await saveWebhookLog(payloadForLog, 'FAILURE', `Erro de parsing ou inicial: ${error.message}`);
    // Still return a 200 to prevent AbacatePay from retrying a malformed request
    return NextResponse.json({ error: 'Falha no processamento do webhook' }, { status: 200 });
  }
}

// Handler para GET para evitar erros de "Method Not Allowed" e fornecer feedback
export async function GET() {
    return NextResponse.json({ message: 'Endpoint de webhook do AbacatePay. Use POST para enviar dados.' }, { status: 200 });
}
