// src/app/actions/checkout-actions.ts
'use server';
import { db } from '@/lib/firebase/admin';
import type { UserProfile } from '@/types/user';

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
