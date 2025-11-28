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

        // Check if a customer with this CPF/CNPJ already exists in Asaas
        const searchResponse = await fetch(`${asaasApiUrl}/customers?cpfCnpj=${validatedData.cpfCnpj.replace(/\D/g, '')}`, {
            headers: { 'access_token': asaasApiKey }, cache: 'no-store',
        });
        const searchResult = await searchResponse.json();

        let asaasCustomerId: string;
        let customerData: any;

        if (searchResult.totalCount > 0) {
            customerData = searchResult.data[0];
            asaasCustomerId = customerData.id;
        } else {
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
            
            customerData = await createCustomerResponse.json();
            
            if (!createCustomerResponse.ok) {
                throw new Error(customerData.errors?.[0]?.description || 'Falha ao criar cliente no Asaas.');
            }
            asaasCustomerId = customerData.id;
        }
        
        await db.collection('users').doc(userId).update({ asaasCustomerId, taxId: validatedData.cpfCnpj });

        return customerData;

    } catch (error: any) {
        console.error('Error in createCustomer:', error);
        throw new Error(error.message || 'Erro desconhecido ao processar a requisição no Asaas.');
    }
}
