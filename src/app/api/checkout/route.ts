// src/app/api/checkout/route.ts
import { NextResponse } from 'next/server';
import { format } from 'date-fns';

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
    let customerId: string;

    // 1. Check if customer exists in Asaas
    const customerSearchResponse = await fetch(`${asaasApiUrl}/customers?cpfCnpj=${customerData.taxId}`, {
        headers: { 'access_token': asaasApiKey },
        cache: 'no-store',
    });
    
    const searchResult = await customerSearchResponse.json() as any;

    if (searchResult.totalCount > 0) {
        customerId = searchResult.data[0].id;
    } else {
        // 2. If not, create the customer
        const createCustomerPayload = {
            name: customerData.fullName,
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

    // 3. Create a new Payment (Cobrança)
    const planDetails = plans[planName as keyof typeof plans];
    if (!planDetails) {
        throw new Error('Plano selecionado inválido.');
    }
    const priceInCents = isYearly ? planDetails.yearly * 12 : planDetails.monthly;
    const priceInReais = priceInCents / 100;
    
    const paymentPayload = {
        customer: customerId,
        billingType: billingType,
        value: priceInReais,
        dueDate: format(new Date(), 'yyyy-MM-dd'),
        description: `Assinatura ${planName} ${isYearly ? 'Anual' : 'Mensal'} - Nutrinea`,
        externalReference: userId,
        metadata: {
            userId: userId,
            plan: planName,
            billingCycle: isYearly ? 'yearly' : 'monthly',
        }
    };

    const createPaymentResponse = await fetch(`${asaasApiUrl}/payments`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'access_token': asaasApiKey,
        },
        body: JSON.stringify(paymentPayload),
    });

    const paymentData = await createPaymentResponse.json() as any;
    if (!createPaymentResponse.ok || paymentData.errors) {
        console.error('Asaas Payment Creation Error:', paymentData.errors);
        throw new Error(paymentData.errors?.[0]?.description || 'Falha ao criar a cobrança.');
    }

    const paymentId = paymentData.id;

    // 4. Get specific payment info based on billing type
    if (billingType === 'PIX') {
        const qrCodeResponse = await fetch(`${asaasApiUrl}/payments/${paymentId}/pixQrCode`, {
            headers: { 'access_token': asaasApiKey }
        });
        const qrCodeData = await qrCodeResponse.json() as any;
        if (!qrCodeResponse.ok || qrCodeData.errors) {
            throw new Error(qrCodeData.errors?.[0]?.description || 'Falha ao obter o QR Code do PIX.');
        }
        return NextResponse.json({
            type: 'PIX',
            id: paymentId,
            payload: qrCodeData.payload,
            encodedImage: qrCodeData.encodedImage,
        });
    }

    if (billingType === 'BOLETO') {
        const idFieldResponse = await fetch(`${asaasApiUrl}/payments/${paymentId}/identificationField`, {
            headers: { 'access_token': asaasApiKey }
        });
        const idFieldData = await idFieldResponse.json() as any;
         if (!idFieldResponse.ok) throw new Error(idFieldData.errors?.[0]?.description || 'Falha ao obter linha digitável.');
        return NextResponse.json({
            type: 'BOLETO',
            id: paymentId,
            identificationField: idFieldData.identificationField,
            bankSlipUrl: paymentData.bankSlipUrl,
        });
    }

    if (billingType === 'CREDIT_CARD') {
        // For credit card, we return the invoice URL which contains the payment link
        return NextResponse.json({
            type: 'CREDIT_CARD',
            id: paymentId,
            invoiceUrl: paymentData.invoiceUrl,
        });
    }

    return NextResponse.json({ error: 'Tipo de cobrança não suportado.' }, { status: 400 });


  } catch (error: any) {
    console.error('Checkout API Route Error:', error);
    return NextResponse.json({ error: error.message || 'Erro interno do servidor.' }, { status: 500 });
  }
}
