// src/app/api/checkout/[chargeId]/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/lib/firebase/admin';

export async function GET(
  request: NextRequest,
  { params }: { params: { chargeId: string } }
) {
  const chargeId = params.chargeId;
  const abacateApiKey = process.env.ABACATE_PAY_API_KEY;

  if (!chargeId) {
    return NextResponse.json({ error: 'ID da cobrança não fornecido.' }, { status: 400 });
  }

  if (!abacateApiKey) {
    console.error('ABACATE_PAY_API_KEY não está configurada no servidor.');
    return NextResponse.json({ error: 'O gateway de pagamento não está configurado.' }, { status: 500 });
  }

  try {
    const abacateApiUrl = `https://api.abacatepay.com/v1/pixQrCode/check/${chargeId}`;

    const response = await fetch(abacateApiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${abacateApiKey}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    
    if (data.error) {
      console.error('AbacatePay Check API Error:', data.error);
      throw new Error(data.error.message || 'Erro ao verificar o status do pagamento.');
    }

    const status = data.data.status;

    // If payment is confirmed, update user's subscription in Firestore
    if (status === 'PAID') {
      const userId = data.data.metadata?.externalId;
      if (userId) {
        const userRef = db.collection('users').doc(userId);
        const userDoc = await userRef.get();
        if (userDoc.exists && userDoc.data()?.subscriptionStatus !== 'premium' && userDoc.data()?.subscriptionStatus !== 'professional') {
            
            const planName = data.data.metadata?.plan;
            let newSubscriptionStatus: 'premium' | 'professional' | 'free' = 'free';
            
            if (planName === 'PREMIUM') {
              newSubscriptionStatus = 'premium';
            } else if (planName === 'PROFISSIONAL') {
              newSubscriptionStatus = 'professional';
            }
            
            if (newSubscriptionStatus !== 'free') {
                await userRef.update({
                    subscriptionStatus: newSubscriptionStatus,
                });
                console.log(`Assinatura do usuário ${userId} atualizada para ${newSubscriptionStatus} via polling.`);
            }
        }
      }
    }

    return NextResponse.json({ status: data.data.status });

  } catch (error: any) {
    console.error('Checkout Status API Route Error:', error);
    return NextResponse.json({ error: error.message || 'Erro interno do servidor.' }, { status: 500 });
  }
}
