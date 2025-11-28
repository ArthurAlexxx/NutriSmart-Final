// src/app/api/checkout/route.ts
import { NextResponse } from 'next/server';

// Mapeamento de planos para os links de pagamento fixos do Asaas
const paymentLinks = {
  PREMIUM: {
    monthly: 'https://sandbox.asaas.com/c/rttsl59852lzvuth',
    yearly: 'https://sandbox.asaas.com/c/tr84srz796zizmq1',
  },
  PROFISSIONAL: {
    monthly: 'https://sandbox.asaas.com/c/x700urqc5ppdovkf',
    yearly: 'https://sandbox.asaas.com/c/waiict1wxx3kigqg',
  }
};

const getAsaasApiUrl = () => {
    const isSandbox = process.env.ASAAS_API_KEY?.includes('sandbox') || process.env.ASAAS_API_KEY?.includes('hmlg');
    return isSandbox ? 'https://sandbox.asaas.com/api/v3' : 'https://api.asaas.com/v3';
};

export async function POST(request: Request) {
  const { userId, planName, isYearly, customerData, billingType } = await request.json();
  const asaasApiKey = process.env.ASAAS_API_KEY;
  const asaasApiUrl = getAsaasApiUrl();

  if (!asaasApiKey) {
      console.error('ASAAS_API_KEY não está configurada no servidor.');
      return NextResponse.json({ error: 'O gateway de pagamento não está configurado corretamente.' }, { status: 500 });
  }

  if (!userId || !customerData || !customerData.fullName || !customerData.email || !customerData.taxId) {
      return NextResponse.json({ error: 'Dados cadastrais incompletos (Nome, E-mail, CPF/CNPJ). Por favor, atualize seu perfil.' }, { status: 400 });
  }
  
  // Seleciona a URL do link de pagamento fixo
  const planLinks = paymentLinks[planName as keyof typeof paymentLinks];
  if (!planLinks) {
      return NextResponse.json({ error: 'Plano selecionado inválido.' }, { status: 400 });
  }
  const paymentUrl = isYearly ? planLinks.yearly : planLinks.monthly;

  try {
    let customerId: string;

    // 1. Check if customer exists in Asaas by CPF/CNPJ
    const customerSearchResponse = await fetch(`${asaasApiUrl}/customers?cpfCnpj=${customerData.taxId}`, {
        headers: { 'access_token': asaasApiKey },
        cache: 'no-store',
    });
    
    const searchResult = await customerSearchResponse.json() as any;

    if (searchResult.totalCount > 0) {
        customerId = searchResult.data[0].id;
        // 2. If customer exists, update their externalReference to our current userId
        // This ensures the webhook will correctly identify the user.
        await fetch(`${asaasApiUrl}/customers/${customerId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'access_token': asaasApiKey },
            body: JSON.stringify({ externalReference: userId }),
        });
    } else {
        // 3. If not, create the customer with the correct externalReference
        const createCustomerPayload = {
            name: customerData.fullName,
            email: customerData.email,
            mobilePhone: customerData.phone,
            cpfCnpj: customerData.taxId,
            externalReference: userId,
        };

        const createCustomerResponse = await fetch(`${asaasApiUrl}/customers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'access_token': asaasApiKey },
            body: JSON.stringify(createCustomerPayload),
        });
        
        const newCustomerData = await createCustomerResponse.json() as any;
        if (!createCustomerResponse.ok || newCustomerData.errors) {
            console.error('Asaas Customer Creation Error:', newCustomerData.errors);
            throw new Error(newCustomerData.errors?.[0]?.description || 'Falha ao criar cliente no gateway de pagamento.');
        }
        customerId = newCustomerData.id;
    }
    
    // 4. Return the correct fixed payment link URL
    return NextResponse.json({
        type: 'CREDIT_CARD', // Or any other relevant type
        id: 'fixed_link', // The ID is now static as it's a fixed link
        url: paymentUrl,
    });

  } catch (error: any) {
    console.error('Checkout API Route Error:', error);
    return NextResponse.json({ error: error.message || 'Erro interno do servidor.' }, { status: 500 });
  }
}
