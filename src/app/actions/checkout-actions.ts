// src/app/actions/checkout-actions.ts
'use server';
import { headers } from 'next/headers';
import { db } from '@/lib/firebase/admin';
import type { UserProfile } from '@/types/user';
import { updateUserSubscriptionAction } from './billing-actions';

const getAsaasApiUrl = () => {
    const isSandbox = process.env.ASAAS_API_KEY?.includes('sandbox') || process.env.ASAAS_API_KEY?.includes('hmlg');
    return isSandbox ? 'https://sandbox.asaas.com/api/v3' : 'https://api.asaas.com/v3';
};

interface CreateCustomerPayload {
    userId: string;
    customerData: Partial<UserProfile>;
}

export async function createCustomer(payload: CreateCustomerPayload): Promise<{ success: boolean; asaasCustomerId?: string; message: string; }> {
    const { userId, customerData } = payload;
    const asaasApiKey = process.env.ASAAS_API_KEY;
    const asaasApiUrl = getAsaasApiUrl();

    if (!asaasApiKey) return { success: false, message: 'Gateway de pagamento não configurado.' };
    if (!customerData.taxId) return { success: false, message: 'CPF/CNPJ é obrigatório.' };

    try {
        const searchResponse = await fetch(`${asaasApiUrl}/customers?cpfCnpj=${customerData.taxId.replace(/\D/g, '')}`, {
            headers: { 'access_token': asaasApiKey }, cache: 'no-store',
        });
        const searchResult = await searchResponse.json();

        let asaasCustomerId: string;

        if (searchResult.totalCount > 0) {
            asaasCustomerId = searchResult.data[0].id;
        } else {
            const createPayload = {
                name: customerData.fullName, email: customerData.email, mobilePhone: customerData.phone?.replace(/\D/g, ''),
                cpfCnpj: customerData.taxId.replace(/\D/g, ''), externalReference: userId, address: customerData.address,
                addressNumber: customerData.addressNumber, complement: customerData.complement,
                province: customerData.province, postalCode: customerData.postalCode?.replace(/\D/g, ''),
            };
            const createResponse = await fetch(`${asaasApiUrl}/customers`, {
                method: 'POST', headers: { 'Content-Type': 'application/json', 'access_token': asaasApiKey },
                body: JSON.stringify(createPayload), cache: 'no-store',
            });
            const newCustomerData = await createResponse.json();
            if (!createResponse.ok) throw new Error(newCustomerData.errors?.[0]?.description || 'Falha ao criar cliente no Asaas.');
            asaasCustomerId = newCustomerData.id;
        }

        await db.collection('users').doc(userId).update({ asaasCustomerId });
        return { success: true, asaasCustomerId, message: 'Cliente criado ou encontrado.' };

    } catch (error: any) {
        console.error("Error creating/finding Asaas customer:", error);
        return { success: false, message: error.message };
    }
}


interface TokenizeAndSubscribePayload {
    asaasCustomerId: string;
    card: {
        holderName: string;
        email: string;
        number: string;
        expiryMonth: string;
        expiryYear: string;
        ccv: string;
    },
    holderInfo: {
        name: string;
        email: string;
        cpfCnpj: string;
        postalCode: string;
        addressNumber: string;
        phone: string;
    },
    subscription: {
        value: number;
        cycle: 'MONTHLY' | 'YEARLY';
        description: string;
        userId: string;
        planName: 'PREMIUM' | 'PROFISSIONAL';
    }
}

export async function tokenizeCardAndCreateSubscription(payload: TokenizeAndSubscribePayload): Promise<{ success: boolean; message: string; }> {
    const asaasApiKey = process.env.ASAAS_API_KEY;
    const asaasApiUrl = getAsaasApiUrl();
    const forwarded = headers().get('x-forwarded-for');
    const remoteIp = forwarded ? forwarded.split(/, /)[0] : '127.0.0.1';

    if (!asaasApiKey) return { success: false, message: 'Gateway de pagamento não configurado.' };

    try {
        // 1. Tokenize Card
        const tokenizationPayload = {
            customer: payload.asaasCustomerId,
            creditCard: {
                holderName: payload.card.holderName,
                number: payload.card.number.replace(/\s/g, ''),
                expiryMonth: payload.card.expiryMonth,
                expiryYear: payload.card.expiryYear,
                ccv: payload.card.ccv,
            },
            creditCardHolderInfo: {
                name: payload.holderInfo.name,
                email: payload.holderInfo.email,
                cpfCnpj: payload.holderInfo.cpfCnpj.replace(/\D/g, ''),
                postalCode: payload.holderInfo.postalCode.replace(/\D/g, ''),
                addressNumber: payload.holderInfo.addressNumber,
                phone: payload.holderInfo.phone.replace(/\D/g, ''),
            },
            remoteIp,
        };
        
        const tokenResponse = await fetch(`${asaasApiUrl}/creditCard/tokenize`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'access_token': asaasApiKey },
            body: JSON.stringify(tokenizationPayload), cache: 'no-store'
        });
        const tokenData = await tokenResponse.json();
        if (!tokenResponse.ok) throw new Error(tokenData.errors?.[0]?.description || 'Falha ao tokenizar o cartão.');
        const creditCardToken = tokenData.creditCardToken;

        // 2. Create Subscription
        const subscriptionPayload = {
            customer: payload.asaasCustomerId,
            billingType: 'CREDIT_CARD',
            nextDueDate: new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().split('T')[0],
            value: payload.subscription.value,
            cycle: payload.subscription.cycle,
            description: payload.subscription.description,
            externalReference: payload.subscription.userId,
            creditCardToken: creditCardToken,
        };

        const subscriptionResponse = await fetch(`${asaasApiUrl}/subscriptions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'access_token': asaasApiKey },
            body: JSON.stringify(subscriptionPayload), cache: 'no-store'
        });
        const subscriptionData = await subscriptionResponse.json();
        if (!subscriptionResponse.ok) throw new Error(subscriptionData.errors?.[0]?.description || 'Falha ao criar a assinatura.');

        // 3. Update User Profile in Firestore
        const billingCycle = payload.subscription.cycle === 'YEARLY' ? 'yearly' : 'monthly';
        const updateResult = await updateUserSubscriptionAction(payload.subscription.userId, payload.subscription.planName, billingCycle, subscriptionData.id);

        if (!updateResult.success) throw new Error(updateResult.message);
        
        return { success: true, message: 'Assinatura criada com sucesso!' };

    } catch (error: any) {
        console.error('Error in tokenizeAndSubscribe:', error);
        return { success: false, message: error.message };
    }
}
