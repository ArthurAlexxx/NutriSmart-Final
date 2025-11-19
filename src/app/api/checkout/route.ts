// src/app/api/checkout/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase/admin';

// Definindo os preços e planos de forma estruturada.
const plans: { [key: string]: { monthly: number, yearly: number } } = {
  PREMIUM: {
    monthly: 1990, // R$ 19,90 em centavos
    yearly: 19080, // R$ 15.90 * 12 em centavos
  },
  CLINICO: {
    monthly: 9990, // R$ 99,90 em centavos
    yearly: 95880, // R$ 79.90 * 12 em centavos
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
  const abacateApiKey = process.env.ABACATE_PAY_API_KEY;

  if (!abacateApiKey) {
      console.error('ABACATE_PAY_API_KEY não está configurada no servidor.');
      return NextResponse.json({ error: 'O gateway de pagamento não está configurado corretamente.' }, { status: 500 });
  }

  try {
    // Busca os dados do usuário no Firestore para criar o cliente na AbacatePay
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
    }
    const userData = userDoc.data();

    // Monta o objeto do cliente com os dados do usuário
    const customer = {
      name: userData?.fullName || 'Usuário NutriSmart',
      email: userData?.email,
      // AbacatePay exige um CPF/CNPJ válido. Usaremos um placeholder para este exemplo.
      // Em uma aplicação real, este dado seria coletado no cadastro.
      taxId: '111.111.111-11', 
    };

    const abacateApiUrl = 'https://api.abacatepay.com/v1/pixQrCode/create';

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
        expiresIn: 3600, // QR Code expira em 1 hora
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

    // Retorna os dados necessários para o frontend renderizar o QR Code
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
