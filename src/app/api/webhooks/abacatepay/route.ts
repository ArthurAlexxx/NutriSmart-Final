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
        return NextResponse.json({ error: 'Configuração de servidor incompleta.' }, { status: 500 });
    }

    if (!signature) {
      return NextResponse.json({ error: 'Assinatura do webhook ausente.' }, { status: 400 });
    }

    const rawBody = await request.text();
    const expectedSignature = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');

    if (signature !== expectedSignature) {
      return NextResponse.json({ error: 'Assinatura do webhook inválida.' }, { status: 403 });
    }
    
    const event = JSON.parse(rawBody);
    
    // Log the event for debugging
    console.log('Received and verified AbacatePay Webhook:', JSON.stringify(event, null, 2));

    // For now, we only care about successful PIX payments
    if (event.event === 'pixQrCode.paid') {
      const charge = event.data;
      const metadata = charge.metadata;

      if (metadata && metadata.externalId) {
        const userId = metadata.externalId;
        const userRef = db.collection('users').doc(userId);

        // Update user's subscription status in Firestore
        await userRef.update({
          subscriptionStatus: 'premium',
        });

        console.log(`User ${userId} subscription updated to premium.`);
      } else {
        console.warn('Webhook received without externalId in metadata:', charge.id);
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });

  } catch (error: any) {
    console.error('Error processing AbacatePay webhook:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
