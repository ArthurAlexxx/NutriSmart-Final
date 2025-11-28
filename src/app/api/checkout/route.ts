// src/app/api/checkout/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase/admin';

const getAsaasApiUrl = () => {
    const isSandbox = process.env.ASAAS_API_KEY?.includes('sandbox') || process.env.ASAAS_API_KEY?.includes('hmlg');
    return isSandbox ? 'https://sandbox.asaas.com/api/v3' : 'https://api.asaas.com/v3';
};

const plansConfig = {
  PREMIUM: { name: 'Premium', price: 29.90, yearlyPrice: 23.90 },
  PROFISSIONAL: { name: 'Profissional', price: 49.90, yearlyPrice: 39.90 },
};

// A minimal 1x1 transparent JPEG encoded in Base64 with data URI prefix
const PLACEHOLDER_IMAGE_BASE64 = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/4QAiRXhpZgAATU0AKgAAAAgAAQESAAMAAAABAAEAAAAAAAD/2wBDAAIBAQIBAQICAgICAgICAwUDAwMDAwYEBAMFBwYHBwcGBwcICQsJCAgKCAcHCg0KCgsMDAwMBwkODw0MDgsMDAz/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAr/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFAEBAAAAAAAAAAAAAAAAAAAAAP/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AL+AAgA//9k=';

async function getOrCreateAsaasCustomer(
  customerData: { taxId: string, fullName: string, email: string, phone?: string },
  asaasApiKey: string,
  asaasApiUrl: string
): Promise<string> {
    // 1. Check if customer exists
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
  
  try {
    const planDetails = plansConfig[planName as keyof typeof plansConfig];
    if (!planDetails) {
        return NextResponse.json({ error: 'Plano selecionado inválido.' }, { status: 400 });
    }
    
    // Step 1: Get or Create Asaas Customer
    const asaasCustomerId = await getOrCreateAsaasCustomer(customerData, asaasApiKey, asaasApiUrl);
    
    // Step 2: Save asaasCustomerId to user's profile in Firestore (non-blocking)
    const userRef = db.collection('users').doc(userId);
    userRef.update({ asaasCustomerId: asaasCustomerId }).catch(err => {
        console.error(`Failed to save asaasCustomerId for user ${userId}:`, err);
    });

    const isSubscription = billingType === 'CREDIT_CARD';
    const value = isYearly ? planDetails.yearlyPrice : planDetails.price;
    const description = `Plano ${planDetails.name} ${isYearly ? 'Anual' : 'Mensal'}`;
    const itemName = planDetails.name;

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.nutrinea.com.br';
    const successUrl = `${baseUrl}/checkout/success`;
    const cancelUrl = `${baseUrl}/pricing`;

    const checkoutPayload: any = {
        customer: asaasCustomerId,
        billingType: billingType,
        externalReference: userId,
        minutesToExpire: 30,
        items: [
            {
                name: itemName,
                description: description,
                value: value,
                quantity: 1,
                imageBase64: PLACEHOLDER_IMAGE_BASE64,
            }
        ],
        callback: {
            autoRedirect: true,
            successUrl: successUrl,
            cancelUrl: cancelUrl,
            expiredUrl: cancelUrl,
        }
    };
    
    if (isSubscription) {
        checkoutPayload.chargeType = 'RECURRENT';
        checkoutPayload.subscription = {
            cycle: isYearly ? 'YEARLY' : 'MONTHLY',
            description: description,
            value: value,
        }
    } else {
        checkoutPayload.chargeType = 'DETACHED';
    }

    const checkoutResponse = await fetch(`${asaasApiUrl}/checkouts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'access_token': asaasApiKey },
        body: JSON.stringify(checkoutPayload),
        cache: 'no-store',
    });

    const checkoutData = await checkoutResponse.json();
    if (!checkoutResponse.ok || checkoutData.errors) {
        console.error('Asaas Checkout API Error:', checkoutData.errors);
        const errorMessage = checkoutData.errors?.[0]?.description || 'Falha ao criar o checkout.';
        return NextResponse.json({ error: errorMessage }, { status: 400 });
    }
    
    return NextResponse.json({
        type: billingType,
        url: checkoutData.url,
        id: checkoutData.id,
    });

  } catch (error: any) {
    console.error('Checkout API Route Error:', error);
    return NextResponse.json({ error: error.message || 'Erro interno do servidor.' }, { status: 500 });
  }
}
