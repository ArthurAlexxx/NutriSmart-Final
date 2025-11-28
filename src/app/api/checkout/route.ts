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
   if (!billingType) {
    return NextResponse.json({ error: "O campo 'billingTypes' é obrigatório." }, { status: 400 });
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

    const value = isYearly ? planDetails.yearlyPrice : planDetails.price;
    const description = `Plano ${planDetails.name} ${isYearly ? 'Anual' : 'Mensal'}`;

    // CREDIT CARD: Use Checkout API for subscriptions
    if (billingType === 'CREDIT_CARD') {
        const checkoutPayload: any = {
            customer: asaasCustomerId,
            billingType: "CREDIT_CARD",
            chargeType: "RECURRENT",
            externalReference: userId,
            minutesToExpire: 30,
            callback: {
                autoRedirect: true,
                successUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/checkout/success`,
            },
            subscription: {
                cycle: isYearly ? 'YEARLY' : 'MONTHLY',
                description: description,
                value: value,
            }
        };

        const checkoutResponse = await fetch(`${asaasApiUrl}/checkouts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'access_token': asaasApiKey },
            body: JSON.stringify(checkoutPayload),
            cache: 'no-store',
        });
        const checkoutData = await checkoutResponse.json();
        if (!checkoutResponse.ok || checkoutData.errors) {
            console.error('Asaas Checkout API Error:', checkoutData.errors);
            throw new Error(checkoutData.errors?.[0]?.description || 'Falha ao criar o checkout.');
        }
        return NextResponse.json({ type: 'CREDIT_CARD', url: checkoutData.url });
    }
    
    // PIX & BOLETO: Use Payments API for one-time charges
    const paymentPayload = {
        customer: asaasCustomerId,
        billingType: billingType,
        value: value,
        dueDate: new Date(new Date().setDate(new Date().getDate() + 3)).toISOString().split('T')[0], // 3 days from now
        description: description,
        externalReference: userId,
    };
    
    const paymentResponse = await fetch(`${asaasApiUrl}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'access_token': asaasApiKey },
        body: JSON.stringify(paymentPayload),
        cache: 'no-store',
    });
    
    const paymentData = await paymentResponse.json();
    if (!paymentResponse.ok) {
        throw new Error(paymentData.errors?.[0]?.description || 'Falha ao criar a cobrança.');
    }
    
    const chargeId = paymentData.id;

    if (billingType === 'PIX') {
        const qrCodeResponse = await fetch(`${asaasApiUrl}/payments/${chargeId}/pixQrCode`, {
            method: 'GET',
            headers: { 'access_token': asaasApiKey },
            cache: 'no-store',
        });
        const qrCodeData = await qrCodeResponse.json();
        if (!qrCodeResponse.ok) throw new Error(qrCodeData.errors?.[0]?.description || 'Falha ao obter QR Code.');
        return NextResponse.json({ type: 'PIX', chargeId, ...qrCodeData });
    }

    if (billingType === 'BOLETO') {
        const identificationFieldResponse = await fetch(`${asaasApiUrl}/payments/${chargeId}/identificationField`, {
            method: 'GET',
            headers: { 'access_token': asaasApiKey },
            cache: 'no-store',
        });
        const identificationFieldData = await identificationFieldResponse.json();
        if (!identificationFieldResponse.ok) throw new Error(identificationFieldData.errors?.[0]?.description || 'Falha ao obter linha digitável.');
        
        return NextResponse.json({ 
            type: 'BOLETO', 
            chargeId,
            identificationField: identificationFieldData.identificationField,
            bankSlipUrl: paymentData.bankSlipUrl 
        });
    }

    return NextResponse.json({ error: 'Método de pagamento não suportado.' }, { status: 400 });


  } catch (error: any) {
    console.error('Checkout API Route Error:', error);
    return NextResponse.json({ error: error.message || 'Erro interno do servidor.' }, { status: 500 });
  }
}
