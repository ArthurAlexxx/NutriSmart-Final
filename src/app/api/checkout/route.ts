
// src/app/api/checkout/route.ts
import { NextResponse } from 'next/server';
import { format, addDays } from 'date-fns';

const getAsaasApiUrl = () => {
    const isSandbox = process.env.ASAAS_API_KEY?.includes('sandbox') || process.env.ASAAS_API_KEY?.includes('hmlg');
    return isSandbox ? 'https://sandbox.asaas.com/api/v3' : 'https://api.asaas.com/v3';
};

const plansConfig = {
  PREMIUM: { name: 'Premium', monthly: 29.90, yearlyPrice: 23.90 },
  PROFISSIONAL: { name: 'Profissional', monthly: 49.90, yearlyPrice: 39.90 },
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
    const planDetails = plansConfig[planName as keyof typeof plansConfig];
    if (!planDetails) {
        return NextResponse.json({ error: 'Plano selecionado inválido.' }, { status: 400 });
    }

    const isSubscription = billingType === 'CREDIT_CARD';
    const value = isYearly ? planDetails.yearlyPrice * (isSubscription ? 1 : 12) : planDetails.monthly;
    const description = `Plano ${planDetails.name} ${isYearly ? 'Anual' : 'Mensal'}`;

    const checkoutPayload: any = {
        name: description,
        description: `Acesso ao plano ${planDetails.name} no Nutrinea.`,
        billingTypes: [billingType],
        chargeTypes: [isSubscription ? 'RECURRENT' : 'DETACHED'],
        value: value,
        externalReference: userId,
        customer: {
          name: customerData.fullName,
          email: customerData.email,
          cpfCnpj: customerData.taxId,
          mobilePhone: customerData.phone,
        },
        callback: {
            autoRedirect: true,
            successUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/checkout/success`,
        }
    };
    
    if (isSubscription) {
        checkoutPayload.subscription = {
            cycle: isYearly ? 'YEARLY' : 'MONTHLY',
            description: description,
        }
    } else {
       checkoutPayload.dueDateLimitDays = 3;
    }

    const checkoutResponse = await fetch(`${asaasApiUrl}/checkouts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'access_token': asaasApiKey },
        body: JSON.stringify(checkoutPayload),
    });

    const checkoutData = await checkoutResponse.json();
    if (!checkoutResponse.ok || checkoutData.errors) {
        throw new Error(checkoutData.errors?.[0]?.description || 'Falha ao criar o checkout.');
    }
    
    // The `url` field contains the link for the customer to complete the payment/subscription
    return NextResponse.json({
        type: billingType,
        url: checkoutData.url,
        id: checkoutData.id, // The checkout ID can be used to poll its status
    });

  } catch (error: any) {
    console.error('Checkout API Route Error:', error);
    return NextResponse.json({ error: error.message || 'Erro interno do servidor.' }, { status: 500 });
  }
}
