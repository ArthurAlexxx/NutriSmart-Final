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
type CustomerFormValues = z.infer<typeof customerFormSchema>;

export async function createCustomer(userId: string, data: CustomerFormValues): Promise<any> {
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
            throw new Error(customerData.errors?.[0]?.description || 'Falha ao criar cliente no Asaas.');
        }

        const asaasCustomerId = customerData.id;
        
        // Update user profile in Firestore with the new customer ID and taxId
        await db.collection('users').doc(userId).update({ asaasCustomerId, taxId: validatedData.cpfCnpj });

        return customerData;

    } catch (error: any) {
        console.error('Error in createCustomer:', error);
        // Ensure a meaningful error message is thrown to the client
        throw new Error(error.message || 'Erro desconhecido ao processar a requisição no Asaas.');
    }
}
