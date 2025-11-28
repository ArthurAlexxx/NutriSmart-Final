
// src/app/api/checkout/route.ts
import { NextResponse } from 'next/server';

const getAsaasApiUrl = () => {
    const isSandbox = process.env.ASAAS_API_KEY?.includes('sandbox') || process.env.ASAAS_API_KEY?.includes('hmlg');
    return isSandbox ? 'https://sandbox.asaas.com/api/v3' : 'https://api.asaas.com/v3';
};

const plansConfig = {
  PREMIUM: { name: 'Premium', price: 29.90, yearlyPrice: 23.90 },
  PROFISSIONAL: { name: 'Profissional', price: 49.90, yearlyPrice: 39.90 },
};

// A minimal 1x1 transparent JPEG encoded in Base64 with data URI prefix
const PLACEHOLDER_IMAGE_BASE64 = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/4QAiRXhpZgAATU0AKgAAAAgAAQESAAMAAAABAAEAAAAAAAD/2wBDAAIBAQIBAQICAgICAgICAwUDAwMDAwYEBAMFBwYHBwcGBwcICQsJCAgKCAcHCg0KCgsMDAwMBwkODw0MDgsMDAz/2wBDAQICAgMDAwYDAwYMCAcIDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAz/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAr/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFAEBAAAAAAAAAAAAAAAAAAAAAP/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AL+AAgA//8QAFQABAQAAAAAAAAAAAAAAAAAAAAr/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFAEBAAAAAAAAAAAAAAAAAAAAAP/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AL+AAgA//9k=';


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
    const value = isYearly ? planDetails.yearlyPrice : planDetails.price;
    const description = `Plano ${planDetails.name} ${isYearly ? 'Anual' : 'Mensal'}`;
    const itemName = description.replace(/[ /]/g, '_').substring(0, 30);


    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.nutrinea.com.br';
    const successUrl = `${baseUrl}/checkout/success`;
    const cancelUrl = `${baseUrl}/pricing`;

    const checkoutPayload: any = {
        billingTypes: [billingType],
        chargeTypes: [isSubscription ? 'RECURRENT' : 'DETACHED'],
        externalReference: userId,
        minutesToExpire: 30,
        items: [
            {
                name: itemName,
                description: description.substring(0, 150),
                value: value,
                quantity: 1, // Quantity is always 1 for subscriptions or per-item
                imageBase64: PLACEHOLDER_IMAGE_BASE64,
            }
        ],
        customerData: {
          name: customerData.fullName,
          email: customerData.email,
          cpfCnpj: customerData.taxId,
          phone: customerData.phone,
          postalCode: customerData.postalCode,
          address: customerData.address,
          addressNumber: customerData.addressNumber,
          complement: customerData.complement,
          province: customerData.province,
        },
        callback: {
            autoRedirect: true,
            successUrl: successUrl,
            cancelUrl: cancelUrl,
            expiredUrl: cancelUrl,
        }
    };
    
    if (isSubscription) {
        checkoutPayload.subscription = {
            cycle: isYearly ? 'YEARLY' : 'MONTHLY',
            description: description,
            value: value, // The value here is the recurring monthly/yearly amount
        }
        // For yearly subscription, we don't set quantity to 12. We set the cycle to YEARLY
        // and the value to the discounted monthly price. Asaas will handle the yearly billing.
        // However, if it's a one-time yearly payment (DETACHED), we'd do value * 12.
        // The current model is RECURRENT, so Asaas handles the cycle.
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
