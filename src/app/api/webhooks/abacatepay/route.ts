// src/app/api/webhooks/abacatepay/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase/admin';

export async function POST(request: Request) {
  try {
    const event = await request.json();
    
    // Log the event for debugging
    console.log('Received AbacatePay Webhook:', JSON.stringify(event, null, 2));

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
