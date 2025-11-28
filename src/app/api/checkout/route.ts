// src/app/api/checkout/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase/admin';
import type { UserProfile } from '@/types/user';

const getAsaasApiUrl = () => {
    const isSandbox = process.env.ASAAS_API_KEY?.includes('sandbox') || process.env.ASAAS_API_KEY?.includes('hmlg');
    return isSandbox ? 'https://sandbox.asaas.com/api/v3' : 'https://api.asaas.com/v3';
};

async function getOrCreateAsaasCustomer(
  userId: string,
  customerData: Partial<UserProfile>,
  asaasApiKey: string,
  asaasApiUrl: string
): Promise<string> {
    if (!customerData.taxId) {
        throw new Error('CPF/CNPJ do cliente é obrigatório para criar ou buscar no gateway de pagamento.');
    }
    
    // 1. Check if customer exists by CPF/CNPJ
    const customerSearchResponse = await fetch(`${asaasApiUrl}/customers?cpfCnpj=${customerData.taxId}`, {
        headers: { 'access_token': asaasApiKey },
        cache: 'no-store',
    });
    const searchResult = await customerSearchResponse.json();

    if (searchResult.totalCount > 0) {
        return searchResult.data[0].id;
    }

    // 2. If not, create customer
    const createCustomerPayload = {
        name: customerData.fullName,
        email: customerData.email,
        mobilePhone: customerData.phone,
        cpfCnpj: customerData.taxId,
        externalReference: userId,
        address: customerData.address,
        addressNumber: customerData.addressNumber,
        complement: customerData.complement,
        province: customerData.province,
        postalCode: customerData.postalCode,
    };
    const createCustomerResponse = await fetch(`${asaasApiUrl}/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'access_token': asaasApiKey },
        body: JSON.stringify(createCustomerPayload),
        cache: 'no-store',
    });
    const newCustomerData = await createCustomerResponse.json();
    if (!createCustomerResponse.ok) {
        console.error("Asaas customer creation error:", newCustomerData.errors);
        throw new Error(newCustomerData.errors?.[0]?.description || 'Falha ao criar cliente no Asaas.');
    }
    return newCustomerData.id;
}


export async function POST(request: Request) {
  const { userId, customerData } = await request.json();
  const asaasApiKey = process.env.ASAAS_API_KEY;
  const asaasApiUrl = getAsaasApiUrl();

  if (!asaasApiKey) {
      return NextResponse.json({ error: 'O gateway de pagamento não está configurado.' }, { status: 500 });
  }
  if (!userId || !customerData) {
      return NextResponse.json({ error: 'Dados insuficientes para processar a requisição.' }, { status: 400 });
  }
  
  try {
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
        return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
    }
    
    const asaasCustomerId = await getOrCreateAsaasCustomer(userId, customerData, asaasApiKey, asaasApiUrl);
    
    // Save asaasCustomerId to user's profile in Firestore if it's not there already
    if (userDoc.data()?.asaasCustomerId !== asaasCustomerId) {
        db.collection('users').doc(userId).update({ asaasCustomerId }).catch(err => {
            console.error(`Failed to save asaasCustomerId for user ${userId}:`, err);
        });
    }

    // Return the customer ID to the frontend to be used in the tokenization call
    return NextResponse.json({ asaasCustomerId });

  } catch (error: any) {
    console.error('Checkout API Route Error:', error);
    return NextResponse.json({ error: error.message || 'Erro interno do servidor.' }, { status: 500 });
  }
}
