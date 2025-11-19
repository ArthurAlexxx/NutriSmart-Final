// src/app/api/webhooks/abacatepay/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/lib/firebase/admin';
import * as crypto from 'crypto';

export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get('abacate-signature');
    const webhookSecret = process.env.ABACATE_PAY_WEBHOOK_SECRET;

    if (!webhookSecret) {
        console.error('ABACATE_PAY_WEBHOOK_SECRET não está configurado.');
        return NextResponse.json({ error: 'Configuração de segurança do servidor incompleta.' }, { status: 500 });
    }

    if (!signature) {
      return NextResponse.json({ error: 'Assinatura do webhook ausente.' }, { status: 400 });
    }

    const rawBody = await request.text();
    const expectedSignature = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');

    if (signature !== expectedSignature) {
      console.warn('Assinatura de webhook inválida recebida.');
      return NextResponse.json({ error: 'Assinatura do webhook inválida.' }, { status: 403 });
    }
    
    const event = JSON.parse(rawBody);
    
    console.log('Webhook do AbacatePay recebido e verificado:', JSON.stringify(event, null, 2));

    if (event.event === 'billing.paid' && event.data?.pixQrCode) {
      const charge = event.data.pixQrCode;
      const metadata = charge.metadata;

      if (metadata && metadata.externalId) {
        const userId = metadata.externalId;
        const planName = metadata.plan;
        const userRef = db.collection('users').doc(userId);
        
        let newSubscriptionStatus: 'premium' | 'professional' | 'free' = 'free';
        if (planName === 'PREMIUM') {
          newSubscriptionStatus = 'premium';
        } else if (planName === 'PROFISSIONAL') {
          newSubscriptionStatus = 'professional';
        } else {
            console.warn(`Plano desconhecido "${planName}" recebido no webhook para o usuário ${userId}.`);
            return NextResponse.json({ received: true, message: 'Plano desconhecido.' }, { status: 200 });
        }

        await userRef.update({
          subscriptionStatus: newSubscriptionStatus,
        });

        console.log(`Assinatura do usuário ${userId} atualizada para ${newSubscriptionStatus}.`);
      } else {
        console.warn('Webhook de pagamento recebido sem o externalId no metadata:', charge.id);
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });

  } catch (error: any) {
    console.error('Erro ao processar o webhook do AbacatePay:', error);
    return NextResponse.json({ error: 'Falha no processamento do webhook' }, { status: 500 });
  }
}
