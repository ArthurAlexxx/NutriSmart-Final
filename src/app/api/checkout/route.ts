
// src/app/api/checkout/route.ts
import { NextResponse } from 'next/server';

// Definindo os preços e planos de forma estruturada.
const plans: { [key: string]: { monthly: number, yearlyDiscountedMonthly: number } } = {
  PREMIUM: {
    monthly: 1990, // R$ 19,90 em centavos
    yearlyDiscountedMonthly: 1590, // R$ 15,90 em centavos (com desconto anual)
  },
  PROFISSIONAL: {
    monthly: 4990, // R$ 49,90 em centavos
    yearlyDiscountedMonthly: 3990, // R$ 39,90 em centavos (com desconto anual)
  }
};

export async function POST(request: Request) {
  const { userId, planName, isYearly, customerData } = await request.json();
  const abacateApiKey = process.env.ABACATE_PAY_API_KEY;

  if (!abacateApiKey) {
      console.error('ABACATE_PAY_API_KEY não está configurada no servidor.');
      return NextResponse.json({ error: 'O gateway de pagamento não está configurado corretamente.' }, { status: 500 });
  }

  const plan = plans[planName as keyof typeof plans];
  
  if (!userId || !planName || !customerData) {
    return NextResponse.json({ error: 'Dados insuficientes para gerar a cobrança (usuário, plano ou dados do cliente).' }, { status: 400 });
  }

  if (!plan) {
    return NextResponse.json({ error: 'Plano não encontrado.' }, { status: 404 });
  }
  
  if (!customerData.name || !customerData.email || !customerData.cellphone || !customerData.taxId) {
      return NextResponse.json({ error: 'Dados cadastrais incompletos (Nome, E-mail, Celular, CPF/CNPJ). Por favor, atualize seu perfil.' }, { status: 400 });
  }
  
  // CORREÇÃO: Calcula o valor anual total multiplicando o valor mensal com desconto por 12.
  const amount = isYearly ? plan.yearlyDiscountedMonthly * 12 : plan.monthly;
  const description = `Assinatura ${planName} ${isYearly ? 'Anual' : 'Mensal'} - NutriSmart`;

  try {
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
        customer: customerData,
        expiresIn: 3600, // QR Code expira em 1 hora
        metadata: {
          externalId: userId,
          plan: planName,
          billingCycle: isYearly ? 'yearly' : 'monthly',
        },
      }),
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      console.error('AbacatePay API Error:', data.error);
      const errorMessage = data.error?.message || data.error || 'Erro ao comunicar com o gateway de pagamento.';
      throw new Error(errorMessage);
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
