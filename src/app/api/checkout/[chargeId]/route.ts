
// src/app/api/checkout/[chargeId]/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/lib/firebase/admin';

async function updateSubscriptionStatus(userId: string, planName: string) {
    let newSubscriptionStatus: 'premium' | 'professional' | 'free' = 'free';

    if (planName === 'PREMIUM') {
        newSubscriptionStatus = 'premium';
    } else if (planName === 'PROFISSIONAL') {
        newSubscriptionStatus = 'professional';
    } else {
        // Se o plano não for reconhecido, não alteramos o status
        throw new Error(`Plano desconhecido: ${planName}`);
    }

    const userRef = db.collection('users').doc(userId);
    await userRef.update({
        subscriptionStatus: newSubscriptionStatus,
    });
    
    return newSubscriptionStatus;
}


export async function GET(request: NextRequest, { params }: { params: { chargeId: string } }) {
  const chargeId = params.chargeId;
  const abacateApiKey = process.env.ABACATE_PAY_API_KEY;
  
  if (!chargeId) {
    return NextResponse.json({ error: 'ID da cobrança não fornecido.' }, { status: 400 });
  }
  
  if (!abacateApiKey) {
    console.error('ABACATE_PAY_API_KEY não está configurada no servidor.');
    return NextResponse.json({ error: 'O gateway de pagamento não está configurado corretamente.' }, { status: 500 });
  }

  try {
    const abacateApiUrl = `https://api.abacatepay.com/v1/pixQrCode/check?id=${chargeId}`;
    const response = await fetch(abacateApiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${abacateApiKey}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store', // Garante que a verificação sempre busque o status mais recente
    });

    const data = await response.json();

    if (!response.ok || data.error) {
       const errorMessage = data.error?.message || data.error || 'Erro ao comunicar com o gateway de pagamento.';
       console.error(`AbacatePay API Error for chargeId ${chargeId}:`, errorMessage);
       throw new Error(errorMessage);
    }
    
    const status = data.data?.pixQrCode?.status;

    if (status === 'PAID') {
        const metadata = data.data?.pixQrCode?.metadata;
        if (metadata && metadata.externalId && metadata.plan) {
            await updateSubscriptionStatus(metadata.externalId, metadata.plan);
            return NextResponse.json({ status: 'PAID' });
        } else {
             console.error("Metadados ausentes ou inválidos na resposta do AbacatePay:", data.data);
             return NextResponse.json({ error: 'Metadados da cobrança ausentes ou inválidos.' }, { status: 400 });
        }
    }

    // Se o status não for 'PAID', retorna 'PENDING'
    return NextResponse.json({ status: 'PENDING' });

  } catch (error: any) {
    console.error(`Error checking payment status for chargeId ${chargeId}:`, error);
    return NextResponse.json({ error: error.message || 'Erro interno do servidor.' }, { status: 500 });
  }
}
