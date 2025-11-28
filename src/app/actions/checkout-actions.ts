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

const paymentFormSchema = z.object({
    billingType: z.enum(['PIX', 'BOLETO']),
    value: z.coerce.number().positive('O valor deve ser maior que zero.'),
    planName: z.enum(['PREMIUM', 'PROFISSIONAL']),
    billingCycle: z.enum(['monthly', 'yearly']),
    customerId: z.string(),
    userId: z.string(),
});
type PaymentFormValues = z.infer<typeof paymentFormSchema>;


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
            throw new Error(paymentData.errors?.[0]?.description || 'Falha ao criar a cobrança.');
        }

        const chargeId = paymentData.id;

        if (data.billingType === 'PIX') {
            const qrCodeResponse = await fetch(`${asaasApiUrl}/payments/${chargeId}/pixQrCode`, {
                headers: { 'access_token': asaasApiKey },
                cache: 'no-store',
            });
            const qrCodeData = await qrCodeResponse.json();
            if (!qrCodeResponse.ok) throw new Error(qrCodeData.errors?.[0]?.description || 'Falha ao obter QR Code.');
            return { type: 'PIX', chargeId: chargeId, ...qrCodeData };
        }

        if (data.billingType === 'BOLETO') {
            const identificationFieldResponse = await fetch(`${asaasApiUrl}/payments/${chargeId}/identificationField`, {
                headers: { 'access_token': asaasApiKey },
                cache: 'no-store',
            });
            const identificationFieldData = await identificationFieldResponse.json();
            if (!identificationFieldResponse.ok) throw new Error(identificationFieldData.errors?.[0]?.description || 'Falha ao obter linha digitável.');
            
            return { 
                type: 'BOLETO', 
                chargeId: chargeId,
                identificationField: identificationFieldData.identificationField,
                bankSlipUrl: paymentData.bankSlipUrl
            };
        }

    } catch (error: any) {
        console.error('Error in createPaymentAction:', error);
        throw new Error(error.message || 'Erro desconhecido ao criar a cobrança.');
    }
}
