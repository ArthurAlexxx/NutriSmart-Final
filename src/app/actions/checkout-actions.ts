// src/app/actions/checkout-actions.ts
'use server';

import { db } from '@/lib/firebase/admin';
import * as z from 'zod';
import { headers } from 'next/headers';

const getAsaasApiUrl = () => {
    const isSandbox = process.env.ASAAS_API_KEY?.includes('sandbox') || process.env.ASAAS_API_KEY?.includes('hmlg');
    return isSandbox ? 'https://sandbox.asaas.com/api/v3' : 'https://api.asaas.com/v3';
};

const customerFormSchema = z.object({
  name: z.string().min(3, 'O nome é obrigatório.'),
  email: z.string().email('O e-mail é obrigatório e deve ser válido.'),
  cpfCnpj: z.string().min(11, 'O CPF/CNPJ é obrigatório.'),
});
type CustomerDataFormValues = z.infer<typeof customerFormSchema>;

const paymentFormSchema = z.object({
    billingType: z.enum(['PIX', 'BOLETO']),
    value: z.coerce.number().positive('O valor deve ser maior que zero.'),
    planName: z.enum(['PREMIUM', 'PROFISSIONAL']),
    billingCycle: z.enum(['monthly', 'yearly']),
    customerId: z.string(),
    userId: z.string(),
});
type PaymentFormValues = z.infer<typeof paymentFormSchema>;

const subscriptionFormSchema = z.object({
    value: z.coerce.number().positive('O valor deve ser maior que zero.'),
    planName: z.enum(['PREMIUM', 'PROFISSIONAL']),
    billingCycle: z.enum(['monthly', 'yearly']),
    customerId: z.string(),
    userId: z.string(),
    creditCardToken: z.string().min(1, 'Token do cartão é obrigatório.'),
});
type SubscriptionFormValues = z.infer<typeof subscriptionFormSchema>;

const tokenizationFormSchema = z.object({
    holderName: z.string().min(3, 'Nome no cartão obrigatório.'),
    number: z.string().min(16, 'Número do cartão inválido.').max(19, 'Número do cartão inválido.'),
    expiryMonth: z.string().min(1, 'Mês inválido.').max(2, 'Mês inválido.'),
    expiryYear: z.string().min(4, 'Ano inválido.').max(4, 'Ano inválido.'),
    ccv: z.string().min(3, 'CCV inválido.').max(4, 'CCV inválido.'),
    customerName: z.string().min(3, 'Nome do cliente obrigatório.'),
    customerEmail: z.string().email('Email do cliente obrigatório.'),
    customerCpfCnpj: z.string().min(11, 'CPF/CNPJ do cliente obrigatório.'),
    customerPostalCode: z.string().min(8, 'CEP do cliente obrigatório.'),
    customerAddressNumber: z.string().min(1, 'Número do endereço obrigatório.'),
    customerPhone: z.string().min(10, 'Telefone do cliente obrigatório.'),
    customerId: z.string(),
});
type TokenizationFormValues = z.infer<typeof tokenizationFormSchema>;


export async function createCustomer(userId: string, data: CustomerDataFormValues): Promise<any> {
    const asaasApiKey = process.env.ASAAS_API_KEY;
    const asaasApiUrl = getAsaasApiUrl();

    if (!asaasApiKey) {
        throw new Error('ASAAS_API_KEY não está configurada no servidor.');
    }
     if (!userId) {
        throw new Error('UserID do usuário não foi fornecido.');
    }

    try {
        const validatedData = customerFormSchema.parse(data);

        const createCustomerPayload = {
            name: validatedData.name,
            email: validatedData.email,
            cpfCnpj: validatedData.cpfCnpj.replace(/\D/g, ''),
            externalReference: userId,
        };

        const createCustomerResponse = await fetch(`${asaasApiUrl}/customers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'access_token': asaasApiKey },
            body: JSON.stringify(createCustomerPayload),
            cache: 'no-store',
        });
        
        const customerData = await createCustomerResponse.json();
        
        if (!createCustomerResponse.ok) {
            console.error("Asaas Create Customer Error:", customerData);
            throw new Error(customerData.errors?.[0]?.description || 'Falha ao criar cliente no gateway de pagamento.');
        }

        const asaasCustomerId = customerData.id;
        
        await db.collection('users').doc(userId).update({ asaasCustomerId, taxId: validatedData.cpfCnpj });

        return customerData;

    } catch (error: any) {
        console.error('Error in createCustomer:', error);
        throw new Error(error.message || 'Erro desconhecido ao criar o cliente de cobrança.');
    }
}


export async function createPaymentAction(data: PaymentFormValues): Promise<any> {
    const asaasApiKey = process.env.ASAAS_API_KEY;
    const asaasApiUrl = getAsaasApiUrl();

    if (!asaasApiKey) {
        throw new Error('ASAAS_API_KEY não está configurada no servidor.');
    }

    try {
        const planText = data.planName === 'PREMIUM' ? 'Premium' : 'Profissional';
        const cycleText = data.billingCycle === 'yearly' ? 'Anual' : 'Mensal';
        const description = `Assinatura Plano ${planText} - ${cycleText}`;

        const paymentPayload = {
            customer: data.customerId,
            billingType: data.billingType,
            value: data.value,
            dueDate: new Date(new Date().setDate(new Date().getDate() + 3)).toISOString().split('T')[0],
            description: description,
            externalReference: data.userId,
            metadata: {
                userId: data.userId,
                plan: data.planName,
                billingCycle: data.billingCycle,
            }
        };

        const paymentResponse = await fetch(`${asaasApiUrl}/payments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'access_token': asaasApiKey },
            body: JSON.stringify(paymentPayload),
            cache: 'no-store',
        });

        const paymentData = await paymentResponse.json();
        if (!paymentResponse.ok) {
            console.error("Asaas Create Payment Error:", paymentData);
            throw new Error(paymentData.errors?.[0]?.description || 'Falha ao criar a cobrança no gateway de pagamento.');
        }

        const chargeId = paymentData.id;

        if (data.billingType === 'PIX') {
            const qrCodeResponse = await fetch(`${asaasApiUrl}/payments/${chargeId}/pixQrCode`, {
                headers: { 'access_token': asaasApiKey },
                cache: 'no-store',
            });
            const qrCodeData = await qrCodeResponse.json();
            if (!qrCodeResponse.ok) throw new Error(qrCodeData.errors?.[0]?.description || 'Falha ao obter o QR Code do PIX.');
            return { type: 'PIX', chargeId: chargeId, ...qrCodeData };
        }

        if (data.billingType === 'BOLETO') {
            return { 
                type: 'BOLETO', 
                chargeId: chargeId,
                bankSlipUrl: paymentData.bankSlipUrl
            };
        }

    } catch (error: any) {
        console.error('Error in createPaymentAction:', error);
        throw new Error(error.message || 'Erro desconhecido ao criar a cobrança.');
    }
}

export async function tokenizeCardAction(data: TokenizationFormValues): Promise<any> {
    const asaasApiKey = process.env.ASAAS_API_KEY;
    const asaasApiUrl = getAsaasApiUrl();

    if (!asaasApiKey) {
        throw new Error('ASAAS_API_KEY não está configurada no servidor.');
    }

    try {
        const tokenizationPayload = {
            customer: data.customerId,
            creditCard: {
                holderName: data.holderName,
                number: data.number.replace(/\s/g, ''),
                expiryMonth: data.expiryMonth,
                expiryYear: data.expiryYear,
                ccv: data.ccv,
            },
            creditCardHolderInfo: {
                name: data.customerName,
                email: data.customerEmail,
                cpfCnpj: data.customerCpfCnpj.replace(/\D/g, ''),
                postalCode: data.customerPostalCode.replace(/\D/g, ''),
                addressNumber: data.customerAddressNumber,
                phone: data.customerPhone.replace(/\D/g, ''),
            },
            remoteIp: '127.0.0.1', 
        };
        
        const response = await fetch(`${asaasApiUrl}/creditCard/tokenize`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'access_token': asaasApiKey },
            body: JSON.stringify(tokenizationPayload),
            cache: 'no-store',
        });

        const responseData = await response.json();
        if (!response.ok) {
            console.error("Asaas Tokenization API Error:", responseData);
            throw new Error(responseData.errors?.[0]?.description || 'Falha ao validar os dados do cartão.');
        }

        return { type: 'TOKENIZATION', ...responseData };

    } catch (error: any) {
        console.error('Error in tokenizeCardAction:', error);
        throw new Error(error.message || 'Erro desconhecido ao validar o cartão.');
    }
}


export async function createSubscriptionAction(data: SubscriptionFormValues): Promise<any> {
    const asaasApiKey = process.env.ASAAS_API_KEY;
    const asaasApiUrl = getAsaasApiUrl();

    if (!asaasApiKey) {
        throw new Error('ASAAS_API_KEY não está configurada no servidor.');
    }

    try {
        const planText = data.planName === 'PREMIUM' ? 'Premium' : 'Profissional';
        const cycleText = data.billingCycle === 'yearly' ? 'Anual' : 'Mensal';
        const description = `Assinatura Plano ${planText} - ${cycleText}`;
        const cycle = data.billingCycle === 'yearly' ? 'YEARLY' : 'MONTHLY';

        const subscriptionPayload = {
            customer: data.customerId,
            billingType: 'CREDIT_CARD',
            nextDueDate: new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().split('T')[0],
            value: data.value,
            cycle: cycle,
            description: description,
            externalReference: data.userId,
            creditCardToken: data.creditCardToken,
            remoteIp: '127.0.0.1', 
        };

        const response = await fetch(`${asaasApiUrl}/subscriptions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'access_token': asaasApiKey },
            body: JSON.stringify(subscriptionPayload),
            cache: 'no-store',
        });

        const responseData = await response.json();
        if (!response.ok) {
            console.error("Asaas Subscription API Error:", responseData);
            throw new Error(responseData.errors?.[0]?.description || 'Falha ao criar a assinatura recorrente.');
        }

        return { type: 'SUBSCRIPTION', ...responseData };

    } catch (error: any) {
        console.error('Error in createSubscriptionAction:', error);
        throw new Error(error.message || 'Erro desconhecido ao criar a assinatura.');
    }
}
