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
        await db.collection('webhook_logs').add(logData);
    } catch (logError) {
        console.error("CRITICAL: Failed to save webhook log.", logError);
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
      await saveWebhookLog(event, 'FAILURE', 'Webhook secret não configurado no servidor.');
      return NextResponse.json({ error: 'Configuração de segurança do servidor incompleta.' }, { status: 500 });
    }

    if (!signature) {
      await saveWebhookLog(event, 'FAILURE', 'Assinatura do webhook ausente.');
      return NextResponse.json({ error: 'Assinatura do webhook ausente.' }, { status: 400 });
    }

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    if (signature !== expectedSignature) {
      console.warn('Assinatura de webhook inválida recebida.');
      await saveWebhookLog(event, 'FAILURE', 'Assinatura inválida.');
      return NextResponse.json({ error: 'Assinatura do webhook inválida.' }, { status: 403 });
    }
    
    // --- Assinatura validada, processar evento ---
    console.log('Webhook do AbacatePay recebido e verificado:', JSON.stringify(event, null, 2));

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
          // Ainda retorna 200 para o AbacatePay não reenviar o webhook
          return NextResponse.json({ received: true, message: 'Plano desconhecido' }, { status: 200 });
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
        await saveWebhookLog(event, 'SUCCESS', message);
    }

    return NextResponse.json({ received: true }, { status: 200 });

  } catch (error: any) {
    console.error('Erro ao processar o webhook do AbacatePay:', error);
    let payloadForLog = {};
    try {
        if(rawBody) payloadForLog = JSON.parse(rawBody);
    } catch {}
    
    await saveWebhookLog(payloadForLog, 'FAILURE', error.message || 'Erro desconhecido no processamento.');
    return NextResponse.json({ error: 'Falha no processamento do webhook' }, { status: 500 });
  }
}

// Handler para GET para evitar erros de "Method Not Allowed" e fornecer feedback
export async function GET() {
    return NextResponse.json({ message: 'Endpoint de webhook do AbacatePay. Use POST para enviar dados.' }, { status: 200 });
}
