// src/app/api/checkout/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase/admin';

const plans: { [key: string]: { monthly: number, yearly: number } } = {
  PREMIUM: {
    monthly: 1990, // R$ 19,90 in cents
    yearly: 19080, // R$ 15.90 * 12 in cents
  },
  CLINICO: {
    monthly: 9990,
    yearly: 95880, // R$ 79.90 * 12
  }
};

export async function POST(request: Request) {
  const { userId, planName, isYearly } = await request.json();

  if (!userId || !planName) {
    return NextResponse.json({ error: 'Dados insuficientes para gerar a cobrança.' }, { status: 400 });
  }

  const plan = plans[planName as keyof typeof plans];
  if (!plan) {
    return NextResponse.json({ error: 'Plano não encontrado.' }, { status: 404 });
  }
  
  const amount = isYearly ? plan.yearly : plan.monthly;
  const description = `Assinatura ${planName} ${isYearly ? 'Anual' : 'Mensal'} - NutriSmart`;

  try {
    // Fetch user data from Firestore to create the customer
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
    }
    const userData = userDoc.data();

    const customer = {
      name: userData?.fullName || 'Usuário NutriSmart',
      email: userData?.email,
      // AbacatePay requires a valid TaxID. We'll use a placeholder for now.
      // In a real app, you would collect this during registration.
      taxId: '111.111.111-11', 
    };

    const abacateApiUrl = 'https://api.abacatepay.com/v1/pixQrCode/create';
    const abacateApiKey = process.env.ABACATE_PAY_API_KEY;

    if (!abacateApiKey) {
        throw new Error('A chave da API do AbacatePay não está configurada no servidor.');
    }

    const response = await fetch(abacateApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${abacateApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount,
        description,
        customer,
        expiresIn: 3600, // 1 hour
        metadata: {
          externalId: userId,
          plan: planName,
          billingCycle: isYearly ? 'yearly' : 'monthly',
        },
      }),
    });

    const data = await response.json();

    if (data.error) {
      console.error('AbacatePay API Error:', data.error);
      throw new Error(data.error.message || 'Erro ao comunicar com o gateway de pagamento.');
    }

    return NextResponse.json({
      id: data.data.id,
      brCode: data.data.brCode,
      brCodeBase64: data.data.brCodeBase64,
    });

  } catch (error: any) {
    console.error('Checkout API Route Error:', error);
    return NextResponse.json({ error: error.message || 'Erro interno do servidor.' }, { status: 500 });
  }
}
