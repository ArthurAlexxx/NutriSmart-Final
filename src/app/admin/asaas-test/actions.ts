'use server';

import * as z from 'zod';
import { format } from 'date-fns';

const customerFormSchema = z.object({
  name: z.string().min(3, 'O nome é obrigatório.'),
  cpfCnpj: z.string().min(11, 'O CPF/CNPJ é obrigatório.'),
  email: z.string().email('O e-mail é obrigatório e deve ser válido.'),
  phone: z.string().optional(),
});

const paymentFormSchema = z.object({
    customerId: z.string().min(1, "O ID do Cliente é obrigatório."),
    value: z.coerce.number().positive("O valor deve ser maior que zero."),
    description: z.string().min(3, "A descrição é obrigatória."),
});

type CustomerFormValues = z.infer<typeof customerFormSchema>;
type PaymentFormValues = z.infer<typeof paymentFormSchema>;

const getAsaasApiUrl = () => {
    const asaasApiKey = process.env.ASAAS_API_KEY;
    const isSandbox = asaasApiKey?.includes('sandbox') || asaasApiKey?.includes('hmlg');
    return isSandbox ? 'https://sandbox.asaas.com/api/v3' : 'https://api.asaas.com/v3';
};


export async function createAsaasCustomerAction(data: CustomerFormValues): Promise<any> {
    const asaasApiKey = process.env.ASAAS_API_KEY;
    const asaasApiUrl = getAsaasApiUrl();

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

export async function createAsaasPaymentAction(data: PaymentFormValues): Promise<any> {
    const asaasApiKey = process.env.ASAAS_API_KEY;
    const asaasApiUrl = getAsaasApiUrl();

    if (!asaasApiKey) {
        throw new Error('ASAAS_API_KEY não está configurada no servidor.');
    }

    try {
        // 1. Create Payment
        const paymentPayload = {
            customer: data.customerId,
            billingType: 'PIX',
            value: data.value,
            dueDate: format(new Date(), 'yyyy-MM-dd'),
            description: data.description,
        };

        const paymentResponse = await fetch(`${asaasApiUrl}/payments`, {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'content-type': 'application/json',
                'access_token': asaasApiKey,
            },
            body: JSON.stringify(paymentPayload),
            cache: 'no-store',
        });

        const paymentData = await paymentResponse.json();
        if (!paymentResponse.ok) {
            console.error('Asaas Payment Creation Error:', paymentData);
            const errorMessage = paymentData.errors?.[0]?.description || 'Falha ao criar a cobrança.';
            throw new Error(errorMessage);
        }
        
        const paymentId = paymentData.id;

        // 2. Get PIX QR Code
        const qrCodeResponse = await fetch(`${asaasApiUrl}/payments/${paymentId}/pixQrCode`, {
            method: 'GET',
            headers: { 'access_token': asaasApiKey },
            cache: 'no-store',
        });

        const qrCodeData = await qrCodeResponse.json();
         if (!qrCodeResponse.ok) {
            console.error('Asaas QR Code Fetch Error:', qrCodeData);
            const errorMessage = qrCodeData.errors?.[0]?.description || 'Falha ao obter o QR Code.';
            throw new Error(errorMessage);
        }

        return qrCodeData;

    } catch (error: any) {
        console.error('Error creating Asaas payment:', error);
        throw new Error(error.message || 'Erro desconhecido ao criar cobrança no Asaas.');
    }
}
