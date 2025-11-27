'use server';

import * as z from 'zod';

const formSchema = z.object({
  name: z.string().min(3, 'O nome é obrigatório.'),
  cpfCnpj: z.string().min(11, 'O CPF/CNPJ é obrigatório.'),
  email: z.string().email('O e-mail é obrigatório e deve ser válido.'),
  phone: z.string().optional(),
});

type CustomerFormValues = z.infer<typeof formSchema>;

export async function createAsaasCustomerAction(data: CustomerFormValues): Promise<any> {
    const asaasApiKey = process.env.ASAAS_API_KEY;
    const isSandbox = asaasApiKey?.includes('sandbox') || asaasApiKey?.includes('hmlg');
    const asaasApiUrl = isSandbox ? 'https://sandbox.asaas.com/api/v3' : 'https://api.asaas.com/v3';

    if (!asaasApiKey) {
        throw new Error('ASAAS_API_KEY não está configurada no servidor.');
    }
    
    try {
        const response = await fetch(`${asaasApiUrl}/customers`, {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'content-type': 'application/json',
                'access_token': asaasApiKey,
            },
            body: JSON.stringify(data),
            cache: 'no-store',
        });

        const responseData = await response.json();

        if (!response.ok) {
            console.error('Asaas API Error:', responseData);
            const errorMessage = responseData.errors?.[0]?.description || `Falha na requisição: ${response.statusText}`;
            throw new Error(errorMessage);
        }

        return responseData;

    } catch (error: any) {
        console.error('Error creating Asaas customer:', error);
        throw new Error(error.message || 'Erro desconhecido ao criar cliente no Asaas.');
    }
}
