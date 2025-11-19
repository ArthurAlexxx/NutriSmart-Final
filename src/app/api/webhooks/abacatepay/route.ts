// src/app/api/webhooks/abacatepay/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/lib/firebase/admin';
import * as crypto from 'crypto';

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

    // É crucial ler o corpo da requisição como texto bruto para a verificação da assinatura
    const rawBody = await request.text();
    const expectedSignature = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');

    // Compara a assinatura gerada com a assinatura enviada pelo AbacatePay
    if (signature !== expectedSignature) {
      console.warn('Assinatura de webhook inválida recebida.');
      return NextResponse.json({ error: 'Assinatura do webhook inválida.' }, { status: 403 });
    }
    
    const event = JSON.parse(rawBody);
    
    // Log do evento para depuração
    console.log('Webhook do AbacatePay recebido e verificado:', JSON.stringify(event, null, 2));

    // Processa apenas eventos de pagamento de cobrança com sucesso (billing.paid)
    if (event.event === 'billing.paid' && event.data?.pixQrCode) {
      const charge = event.data.pixQrCode;
      const metadata = charge.metadata;

      // Garante que o metadata com o ID do nosso usuário exista
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


        // Atualiza o status da assinatura do usuário no Firestore
        await userRef.update({
          subscriptionStatus: newSubscriptionStatus,
        });

        console.log(`Assinatura do usuário ${userId} atualizada para ${newSubscriptionStatus}.`);
      } else {
        console.warn('Webhook de pagamento recebido sem o externalId no metadata:', charge.id);
      }
    }

    // Retorna uma resposta de sucesso para o AbacatePay
    return NextResponse.json({ received: true }, { status: 200 });

  } catch (error: any) {
    console.error('Erro ao processar o webhook do AbacatePay:', error);
    return NextResponse.json({ error: 'Falha no processamento do webhook' }, { status: 500 });
  }
}
