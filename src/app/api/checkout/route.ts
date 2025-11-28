
// src/app/api/checkout/route.ts
import { NextResponse } from 'next/server';
import { format } from 'date-fns';

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

const plansConfig = {
  PREMIUM: { name: 'Premium', monthly: 29.90, yearly: 23.90 },
  PROFISSIONAL: { name: 'Profissional', monthly: 49.90, yearly: 39.90 },
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

    const customerSearchResponse = await fetch(`${asaasApiUrl}/customers?cpfCnpj=${customerData.taxId}`, {
        headers: { 'access_token': asaasApiKey },
        cache: 'no-store',
    });
    
    const searchResult = await customerSearchResponse.json() as any;

    if (searchResult.totalCount > 0) {
        customerId = searchResult.data[0].id;
        // Ensure externalReference is set on existing customer
        await fetch(`${asaasApiUrl}/customers/${customerId}`, {
            method: 'POST', // POST to update
            headers: { 'Content-Type': 'application/json', 'access_token': asaasApiKey },
            body: JSON.stringify({ externalReference: userId }),
        });
    } else {
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
            throw new Error(newCustomerData.errors?.[0]?.description || 'Falha ao criar cliente no gateway de pagamento.');
        }
        customerId = newCustomerData.id;
    }
    
    // --- Lógica de bifurcação para tipo de pagamento ---
    if (billingType === 'CREDIT_CARD') {
        const planLinks = paymentLinks[planName as keyof typeof paymentLinks];
        if (!planLinks) {
            return NextResponse.json({ error: 'Plano selecionado inválido.' }, { status: 400 });
        }
        const paymentUrl = isYearly ? planLinks.yearly : planLinks.monthly;
        
        return NextResponse.json({
            type: 'CREDIT_CARD',
            id: 'fixed_link', // Use a placeholder ID for fixed links
            url: paymentUrl,
        });

    } else { // Para PIX e BOLETO, criar cobrança dinâmica
        
        const planDetails = plansConfig[planName as keyof typeof plansConfig];
        if (!planDetails) {
            return NextResponse.json({ error: 'Plano selecionado inválido.' }, { status: 400 });
        }
        
        const value = isYearly ? planDetails.yearlyPrice * 12 : planDetails.monthly;
        const description = `Assinatura ${planDetails.name} ${isYearly ? 'Anual' : 'Mensal'} - Nutrinea`;

        const paymentPayload = {
            customer: customerId,
            billingType: billingType,
            value: value,
            dueDate: format(addDays(new Date(), 3), 'yyyy-MM-dd'),
            description: description,
            externalReference: userId,
        };

        const paymentResponse = await fetch(`${asaasApiUrl}/payments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'access_token': asaasApiKey },
            body: JSON.stringify(paymentPayload),
        });

        const paymentData = await paymentResponse.json();
        if (!paymentResponse.ok || paymentData.errors) {
            throw new Error(paymentData.errors?.[0]?.description || 'Falha ao criar cobrança dinâmica.');
        }
        
        const paymentId = paymentData.id;
        
        if (billingType === 'PIX') {
            const qrCodeResponse = await fetch(`${asaasApiUrl}/payments/${paymentId}/pixQrCode`, {
                headers: { 'access_token': asaasApiKey },
            });
            const qrCodeData = await qrCodeResponse.json();
             if (!qrCodeResponse.ok) throw new Error(qrCodeData.errors?.[0]?.description || 'Falha ao obter QR Code.');
            return NextResponse.json({ type: 'PIX', id: paymentId, ...qrCodeData });
        }
        
        if (billingType === 'BOLETO') {
             const identificationFieldResponse = await fetch(`${asaasApiUrl}/payments/${paymentId}/identificationField`, {
                headers: { 'access_token': asaasApiKey },
            });
            const identificationFieldData = await identificationFieldResponse.json();
            if (!identificationFieldResponse.ok) throw new Error(identificationFieldData.errors?.[0]?.description || 'Falha ao obter linha digitável.');
            
            return NextResponse.json({ 
                type: 'BOLETO', 
                id: paymentId,
                identificationField: identificationFieldData.identificationField,
                bankSlipUrl: paymentData.bankSlipUrl 
            });
        }
        
        return NextResponse.json({ error: 'Método de pagamento não suportado.'}, { status: 400 });
    }

  } catch (error: any) {
    console.error('Checkout API Route Error:', error);
    return NextResponse.json({ error: error.message || 'Erro interno do servidor.' }, { status: 500 });
  }
}
