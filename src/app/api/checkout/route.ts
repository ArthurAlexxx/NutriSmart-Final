
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
    const isSandbox = process.env.ASAAS_API_KEY?.includes('sandbox') || process.env.ASAAS_API_KEY?.includes('hmlg');
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

  if (!userId || !customerData) {
    return NextResponse.json({ error: 'Dados insuficientes para processar (usuário ou dados do cliente).' }, { status: 400 });
  }
  
  if (!customerData.name || !customerData.email || !customerData.taxId) {
      return NextResponse.json({ error: 'Dados cadastrais incompletos (Nome, E-mail, CPF/CNPJ). Por favor, atualize seu perfil.' }, { status: 400 });
  }
  
  try {
    let customerId: string;

    // 1. Check if customer exists in Asaas
    const customerSearchResponse = await fetch(`${asaasApiUrl}/customers?cpfCnpj=${customerData.taxId}`, {
        headers: { 'access_token': asaasApiKey }
    });
    
    const searchResult = await customerSearchResponse.json() as any;

    if (searchResult.totalCount > 0) {
        customerId = searchResult.data[0].id;
    } else {
        // 2. If not, create the customer
        const createCustomerPayload = {
            name: customerData.name,
            email: customerData.email,
            mobilePhone: customerData.phone,
            cpfCnpj: customerData.taxId,
            externalReference: userId,
        };

        const createCustomerResponse = await fetch(`${asaasApiUrl}/customers`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'access_token': asaasApiKey,
            },
            body: JSON.stringify(createCustomerPayload),
        });
        
        const newCustomerData = await createCustomerResponse.json() as any;
        if (!createCustomerResponse.ok || newCustomerData.errors) {
            console.error('Asaas Customer Creation Error:', newCustomerData.errors);
            throw new Error(newCustomerData.errors?.[0]?.description || 'Falha ao criar cliente no gateway de pagamento.');
        }
        customerId = newCustomerData.id;
    }
    
    // DEBUG: Return success after customer creation/retrieval
    return NextResponse.json({
        message: 'Cliente criado/encontrado com sucesso!',
        customerId: customerId,
    });

  } catch (error: any) {
    console.error('Checkout API Route Error:', error);
    return NextResponse.json({ error: error.message || 'Erro interno do servidor.' }, { status: 500 });
  }
}
