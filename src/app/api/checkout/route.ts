// src/app/api/checkout/route.ts
import { NextResponse } from 'next/server';
import { format } from 'date-fns';

const plans: { [key: string]: { monthly: number, yearlyPrice: number } } = {
  PREMIUM: {
    monthly: 2990,
    yearlyPrice: 239,
  },
  PROFISSIONAL: {
    monthly: 4990,
    yearlyPrice: 399,
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

    const planDetails = plans[planName as keyof typeof plans];
    if (!planDetails) {
        throw new Error('Plano selecionado inválido.');
    }
    
    const basePriceInReais = isYearly ? (planDetails.yearlyPrice * 12) / 100 : planDetails.monthly / 100;
    let finalPrice = basePriceInReais;

    // Add a 10% surcharge for PIX payments
    if (billingType === 'PIX') {
        finalPrice = parseFloat((finalPrice * 1.10).toFixed(2));
    }
    
    // 3. Handle payment based on billingType
    if (billingType === 'CREDIT_CARD') {
        const subscriptionPayload = {
            customer: customerId,
            billingType: "CREDIT_CARD",
            nextDueDate: format(new Date(), 'yyyy-MM-dd'),
            value: isYearly ? planDetails.yearlyPrice : planDetails.price / 100, // Asaas subscription value is per cycle
            cycle: isYearly ? 'YEARLY' : 'MONTHLY',
            description: `Assinatura ${planName} ${isYearly ? 'Anual' : 'Mensal'} - Nutrinea`,
            externalReference: userId,
        };

        const createSubscriptionResponse = await fetch(`${asaasApiUrl}/subscriptions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'access_token': asaasApiKey,
            },
            body: JSON.stringify(subscriptionPayload),
        });

        const subscriptionData = await createSubscriptionResponse.json() as any;
        if (!createSubscriptionResponse.ok || subscriptionData.errors) {
            console.error('Asaas Subscription Creation Error:', subscriptionData.errors);
            throw new Error(subscriptionData.errors?.[0]?.description || 'Falha ao criar a assinatura.');
        }

        const latestPayment = subscriptionData.payments?.[0];
        if (!latestPayment?.invoiceUrl) {
            throw new Error('Não foi possível obter o link de pagamento da assinatura.');
        }

        return NextResponse.json({
            type: 'CREDIT_CARD',
            id: latestPayment.id,
            invoiceUrl: latestPayment.invoiceUrl,
        });

    } else {
        // Handle PIX and BOLETO as single payments
        const paymentPayload = {
            customer: customerId,
            billingType: billingType,
            value: finalPrice,
            dueDate: format(new Date(), 'yyyy-MM-dd'),
            description: `Assinatura ${planName} ${isYearly ? 'Anual' : 'Mensal'} - Nutrinea`,
            externalReference: userId,
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

        if (billingType === 'PIX') {
            const qrCodeResponse = await fetch(`${asaasApiUrl}/payments/${paymentId}/pixQrCode`, {
                headers: { 'access_token': asaasApiKey },
                cache: 'no-store',
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
    }

    return NextResponse.json({ error: 'Tipo de cobrança não suportado.' }, { status: 400 });

  } catch (error: any) {
    console.error('Checkout API Route Error:', error);
    return NextResponse.json({ error: error.message || 'Erro interno do servidor.' }, { status: 500 });
  }
}
