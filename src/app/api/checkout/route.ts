// src/app/api/checkout/route.ts
import { NextResponse } from 'next/server';
import { format } from 'date-fns';

const plans: { [key: string]: { monthly: number, yearlyPrice: number } } = {
  PREMIUM: {
    monthly: 29.90,
    yearlyPrice: 23.90,
  },
  PROFISSIONAL: {
    monthly: 49.90,
    yearlyPrice: 39.90,
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
  
  const planDetails = plans[planName as keyof typeof plans];
  if (!planDetails) {
      return NextResponse.json({ error: 'Plano selecionado inválido.' }, { status: 400 });
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
    
    // 3. Handle payment based on billingType
    if (billingType === 'CREDIT_CARD') {
        const description = `Assinatura ${planName} ${isYearly ? 'Anual' : 'Mensal'} - Nutrinea`;

        let cycle: 'MONTHLY' | 'YEARLY';
        let finalPrice: number;

        if (isYearly) {
            cycle = 'YEARLY';
            finalPrice = Math.round(planDetails.yearlyPrice * 12 * 100) / 100;
        } else {
            cycle = 'MONTHLY';
            finalPrice = planDetails.monthly;
        }

        const paymentLinkPayload = {
            name: description,
            description: `Acesso ao plano ${planName} do Nutrinea.`,
            billingType: "CREDIT_CARD",
            chargeType: "RECURRENT",
            subscriptionCycle: cycle,
            value: finalPrice,
            maxInstallmentCount: isYearly ? 12 : 1, 
            notificationEnabled: true,
        };

        const createLinkResponse = await fetch(`${asaasApiUrl}/paymentLinks`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'access_token': asaasApiKey,
            },
            body: JSON.stringify(paymentLinkPayload),
        });

        const linkData = await createLinkResponse.json() as any;
        
        if (!createLinkResponse.ok || !linkData || linkData.errors) {
            console.error('Asaas Payment Link Creation Error:', linkData?.errors);
            throw new Error(linkData?.errors?.[0]?.description || 'Falha ao criar o link de pagamento.');
        }

        const updatePayload = {
            customer: customerId,
            subscriptionExternalReference: userId,
        };

        const updateLinkResponse = await fetch(`${asaasApiUrl}/paymentLinks/${linkData.id}`, {
             method: 'POST',
             headers: { 'Content-Type': 'application/json', 'access_token': asaasApiKey },
            body: JSON.stringify(updatePayload),
        });

        if (!updateLinkResponse.ok) {
            const errorData = await updateLinkResponse.json();
            console.error('Asaas Payment Link Update Error:', errorData?.errors);
            throw new Error(errorData?.errors?.[0]?.description || 'Falha ao associar usuário ao link de pagamento.');
        }

        return NextResponse.json({
            type: 'CREDIT_CARD',
            id: linkData.id,
            url: linkData.url,
        });

    } else {
        const basePrice = isYearly ? planDetails.yearlyPrice * 12 : planDetails.monthly;
        let finalPrice = basePrice;
        
        // Sobretaxa de 10% para PIX
        if (billingType === 'PIX') {
            finalPrice = Math.round(finalPrice * 1.10 * 100) / 100;
        }
        
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
