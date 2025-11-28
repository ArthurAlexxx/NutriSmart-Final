// src/app/admin/asaas-test/actions.ts
'use server';

import * as z from 'zod';

const formSchema = z.object({
  name: z.string().min(3, 'O nome é obrigatório.'),
  cpfCnpj: z.string().min(11, 'O CPF/CNPJ é obrigatório.'),
});

type FormValues = z.infer<typeof formSchema>;

const getAsaasApiUrl = () => {
    const asaasApiKey = process.env.ASAAS_API_KEY;
    const isSandbox = asaasApiKey?.includes('sandbox') || asaasApiKey?.includes('hmlg');
    return isSandbox ? 'https://sandbox.asaas.com/api/v3' : 'https://api.asaas.com/v3';
};

export async function createCustomerAction(data: FormValues): Promise<any> {
    const asaasApiKey = process.env.ASAAS_API_KEY;
    const asaasApiUrl = getAsaasApiUrl();

    if (!asaasApiKey) {
        throw new Error('ASAAS_API_KEY não está configurada no servidor.');
    }

    try {
        const createCustomerPayload = {
            name: data.name,
            cpfCnpj: data.cpfCnpj,
        };

        const createCustomerResponse = await fetch(`${asaasApiUrl}/customers`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json', 
                'access_token': asaasApiKey 
            },
            body: JSON.stringify(createCustomerPayload),
            cache: 'no-store',
        });
        
        const newCustomerData = await createCustomerResponse.json();
        
        if (!createCustomerResponse.ok) {
            const errorMessage = newCustomerData.errors?.[0]?.description || 'Falha ao criar cliente no Asaas.';
            throw new Error(errorMessage);
        }
        
        return newCustomerData;

    } catch (error: any) {
        console.error('Error in createCustomerAction:', error);
        throw new Error(error.message || 'Erro desconhecido ao processar a requisição no Asaas.');
    }
}
