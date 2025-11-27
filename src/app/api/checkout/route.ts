// src/app/api/checkout/route.ts
import { NextResponse } from 'next/server';
import fetch from 'node-fetch';

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

const getAsaasApiUrl = () => {
    const isSandbox = process.env.ASAAS_API_KEY?.includes('sandbox');
    return isSandbox ? 'https://sandbox.asaas.com/api/v3' : 'https://api.asaas.com/v3';
};


export async function POST(request: Request) {
  const { userId, planName, isYearly, customerData } = await request.json();
  const asaasApiKey = process.env.ASAAS_API_KEY;
  const asaasApiUrl = getAsaasApiUrl();

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
    let customerId: string;

    // 1. Check if customer exists in Asaas
    const customerSearchResponse = await fetch(`${asaasApiUrl}/customers?cpfCnpj=${customerData.taxId}`, {
        headers: { 'access_token': asaasApiKey }
    });
    
    const searchResult = await customerSearchResponse.json();

    if (searchResult.totalCount > 0) {
        customerId = searchResult.data[0].id;
    } else {
        // 2. If not, create the customer
        const createCustomerResponse = await fetch(`${asaasApiUrl}/customers`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'access_token': asaasApiKey,
            },
            body: JSON.stringify({
                name: customerData.name,
                email: customerData.email,
                mobilePhone: customerData.phone,
                cpfCnpj: customerData.taxId,
                externalReference: userId,
            }),
        });
        const newCustomerData = await createCustomerResponse.json();
        if (!createCustomerResponse.ok) {
            throw new Error(newCustomerData.errors?.[0]?.description || 'Falha ao criar cliente no gateway de pagamento.');
        }
        customerId = newCustomerData.id;
    }
    
    // 3. Create the payment (charge)
    const paymentResponse = await fetch(`${asaasApiUrl}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': asaasApiKey,
      },
      body: JSON.stringify({
        customer: customerId,
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

    const paymentData = await paymentResponse.json();

    if (!paymentResponse.ok || paymentData.errors) {
      console.error('Asaas API Error:', paymentData.errors);
      const errorMessage = paymentData.errors?.[0]?.description || 'Erro ao comunicar com o gateway de pagamento.';
      throw new Error(errorMessage);
    }
    
    // 4. Get the PIX QR Code for the created payment
    const qrCodeResponse = await fetch(`${asaasApiUrl}/payments/${paymentData.id}/pixQrCode`, {
        headers: { 'access_token': asaasApiKey }
    });

    const qrCodeData = await qrCodeResponse.json();
    
    if (!qrCodeResponse.ok) {
        throw new Error(qrCodeData.errors?.[0]?.description || 'Falha ao obter QR Code.');
    }

    return NextResponse.json({
      id: paymentData.id,
      brCode: qrCodeData.payload,
      brCodeBase64: qrCodeData.encodedImage,
    });

  } catch (error: any) {
    console.error('Checkout API Route Error:', error);
    return NextResponse.json({ error: error.message || 'Erro interno do servidor.' }, { status: 500 });
  }
}
