// src/app/api/checkout/route.ts
import { NextResponse } from 'next/server';

const plans: { [key: string]: { monthly: number, yearly: number } } = {
  PREMIUM: {
    monthly: 2990,
    yearly: 2390,
  },
  PROFISSIONAL: {
    monthly: 4990,
    yearly: 3990,
  }
};

export async function POST(request: Request) {
  const { userId, planName, isYearly, customerData } = await request.json();
  const asaasApiKey = process.env.ASAAS_API_KEY;

  if (!asaasApiKey) {
      console.error('ASAAS_API_KEY não está configurada no servidor.');
      return NextResponse.json({ error: 'O gateway de pagamento não está configurado corretamente.' }, { status: 500 });
  }

  const plan = plans[planName as keyof typeof plans];
  
  if (!userId || !planName || !customerData) {
    return NextResponse.json({ error: 'Dados insuficientes para gerar a cobrança (usuário, plano ou dados do cliente).' }, { status: 400 });
  }

  if (!plan) {
    return NextResponse.json({ error: 'Plano não encontrado.' }, { status: 404 });
  }
  
  if (!customerData.name || !customerData.email || !customerData.taxId) {
      return NextResponse.json({ error: 'Dados cadastrais incompletos (Nome, E-mail, CPF/CNPJ). Por favor, atualize seu perfil.' }, { status: 400 });
  }
  
  const amountPerMonthInCents = isYearly ? plan.yearly : plan.monthly;
  const totalAmountInCents = isYearly ? amountPerMonthInCents * 12 : amountPerMonthInCents;
  const description = `Assinatura ${planName} ${isYearly ? 'Anual' : 'Mensal'} - Nutrinea`;
  const totalValue = totalAmountInCents / 100;

  try {
    const asaasApiUrl = 'https://www.asaas.com/api/v3/payments';

    const response = await fetch(asaasApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': asaasApiKey,
      },
      body: JSON.stringify({
        customer: customerData.id,
        billingType: 'PIX',
        value: totalValue,
        dueDate: new Date(new Date().getTime() + 3600 * 1000).toISOString().split('T')[0], // Expires in 1 hour
        description,
        externalReference: userId,
        metadata: {
          userId: userId,
          plan: planName,
          billingCycle: isYearly ? 'yearly' : 'monthly',
        },
      }),
    });

    const data = await response.json();

    if (!response.ok || data.errors) {
      console.error('Asaas API Error:', data.errors);
      const errorMessage = data.errors?.[0]?.description || 'Erro ao comunicar com o gateway de pagamento.';
      throw new Error(errorMessage);
    }
    
    // After creating payment, we need to get the QR Code
    const qrCodeResponse = await fetch(`https://www.asaas.com/api/v3/payments/${data.id}/pixQrCode`, {
        headers: { 'access_token': asaasApiKey }
    });

    const qrCodeData = await qrCodeResponse.json();
    
    if (!qrCodeResponse.ok) {
        throw new Error(qrCodeData.errors?.[0]?.description || 'Falha ao obter QR Code.');
    }

    return NextResponse.json({
      id: data.id,
      brCode: qrCodeData.payload,
      brCodeBase64: qrCodeData.encodedImage,
    });

  } catch (error: any) {
    console.error('Checkout API Route Error:', error);
    return NextResponse.json({ error: error.message || 'Erro interno do servidor.' }, { status: 500 });
  }
}
