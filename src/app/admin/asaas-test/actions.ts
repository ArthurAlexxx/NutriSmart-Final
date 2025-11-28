// src/app/admin/asaas-test/actions.ts
'use server';

import * as z from 'zod';
import { format } from 'date-fns';

const formSchema = z.object({
  name: z.string().min(3, 'O nome é obrigatório.'),
  cpfCnpj: z.string().min(11, 'O CPF/CNPJ é obrigatório.'),
  email: z.string().email('O e-mail é obrigatório e deve ser válido.'),
  phone: z.string().optional(),
  billingType: z.enum(['PIX', 'BOLETO', 'CREDIT_CARD']),
  value: z.coerce.number().positive("O valor deve ser maior que zero."),
  description: z.string().min(3, "A descrição é obrigatória."),
});

type FormValues = z.infer<typeof formSchema>;

const getAsaasApiUrl = () => {
    const asaasApiKey = process.env.ASAAS_API_KEY;
    const isSandbox = asaasApiKey?.includes('sandbox') || asaasApiKey?.includes('hmlg');
    return isSandbox ? 'https://sandbox.asaas.com/api/v3' : 'https://api.asaas.com/v3';
};


export async function createCustomerAndPaymentAction(data: FormValues): Promise<any> {
    const asaasApiKey = process.env.ASAAS_API_KEY;
    const asaasApiUrl = getAsaasApiUrl();

    if (!asaasApiKey) {
        throw new Error('ASAAS_API_KEY não está configurada no servidor.');
    }

    try {
        // 1. Check if customer exists
        const customerSearchResponse = await fetch(`${asaasApiUrl}/customers?cpfCnpj=${data.cpfCnpj}`, {
            headers: { 'access_token': asaasApiKey },
            cache: 'no-store',
        });
        const searchResult = await customerSearchResponse.json();

        let customerId: string;

        if (searchResult.totalCount > 0) {
            customerId = searchResult.data[0].id;
        } else {
            // 2. If not, create customer
            const createCustomerPayload = {
                name: data.name,
                email: data.email,
                mobilePhone: data.phone,
                cpfCnpj: data.cpfCnpj,
            };
            const createCustomerResponse = await fetch(`${asaasApiUrl}/customers`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'access_token': asaasApiKey },
                body: JSON.stringify(createCustomerPayload),
                cache: 'no-store',
            });
            const newCustomerData = await createCustomerResponse.json();
            if (!createCustomerResponse.ok) {
                throw new Error(newCustomerData.errors?.[0]?.description || 'Falha ao criar cliente no Asaas.');
            }
            customerId = newCustomerData.id;
        }

        // 3. Create Payment
        const paymentPayload = {
            customer: customerId,
            billingType: data.billingType,
            value: data.value,
            dueDate: format(new Date(), 'yyyy-MM-dd'),
            description: data.description,
        };

        const paymentResponse = await fetch(`${asaasApiUrl}/payments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'access_token': asaasApiKey },
            body: JSON.stringify(paymentPayload),
            cache: 'no-store',
        });

        const paymentData = await paymentResponse.json();
        if (!paymentResponse.ok) {
            throw new Error(paymentData.errors?.[0]?.description || 'Falha ao criar a cobrança.');
        }
        
        const paymentId = paymentData.id;

        // 4. Get specific payment info based on billing type
        if (data.billingType === 'PIX') {
            const qrCodeResponse = await fetch(`${asaasApiUrl}/payments/${paymentId}/pixQrCode`, {
                method: 'GET',
                headers: { 'access_token': asaasApiKey },
                cache: 'no-store',
            });
            const qrCodeData = await qrCodeResponse.json();
            if (!qrCodeResponse.ok) throw new Error(qrCodeData.errors?.[0]?.description || 'Falha ao obter QR Code.');
            return { type: 'PIX', ...qrCodeData };
        }
        
        if (data.billingType === 'BOLETO') {
             const identificationFieldResponse = await fetch(`${asaasApiUrl}/payments/${paymentId}/identificationField`, {
                method: 'GET',
                headers: { 'access_token': asaasApiKey },
                cache: 'no-store',
            });
            const identificationFieldData = await identificationFieldResponse.json();
            if (!identificationFieldResponse.ok) throw new Error(identificationFieldData.errors?.[0]?.description || 'Falha ao obter linha digitável.');
            
            return { 
                type: 'BOLETO', 
                identificationField: identificationFieldData.identificationField,
                bankSlipUrl: paymentData.bankSlipUrl 
            };
        }
        
        if (data.billingType === 'CREDIT_CARD') {
             // For Credit Card, we don't have an immediate action like PIX QR or Boleto line.
             // We can return the checkout URL for the user to be redirected.
             // This might require a different flow (e.g., using the checkout endpoint).
             // For this test, let's assume we'll just open a pre-defined payment link.
             return { type: 'CREDIT_CARD', transactionReceiptUrl: paymentData.transactionReceiptUrl };
        }

        throw new Error('Tipo de cobrança não suportado.');

    } catch (error: any) {
        console.error('Error in createCustomerAndPaymentAction:', error);
        throw new Error(error.message || 'Erro desconhecido ao processar a requisição no Asaas.');
    }
}
