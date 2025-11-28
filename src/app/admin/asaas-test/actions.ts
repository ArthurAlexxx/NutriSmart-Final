// src/app/admin/asaas-test/actions.ts
'use server';

import * as z from 'zod';

const customerFormSchema = z.object({
  name: z.string().min(3, 'O nome é obrigatório.'),
  cpfCnpj: z.string().min(11, 'O CPF/CNPJ é obrigatório.'),
});
type CustomerFormValues = z.infer<typeof customerFormSchema>;


const paymentFormSchema = z.object({
    billingType: z.enum(['PIX', 'BOLETO']),
    value: z.coerce.number().positive('O valor deve ser maior que zero.'),
    customerId: z.string(),
    userId: z.string(), // Adicionado para vincular ao nosso usuário
});
type PaymentFormValues = z.infer<typeof paymentFormSchema>;


const getAsaasApiUrl = () => {
    const asaasApiKey = process.env.ASAAS_API_KEY;
    const isSandbox = asaasApiKey?.includes('sandbox') || asaasApiKey?.includes('hmlg');
    return isSandbox ? 'https://sandbox.asaas.com/api/v3' : 'https://api.asaas.com/v3';
};

export async function createCustomerAction(data: CustomerFormValues): Promise<any> {
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


export async function createPaymentAction(data: PaymentFormValues): Promise<any> {
    const asaasApiKey = process.env.ASAAS_API_KEY;
    const asaasApiUrl = getAsaasApiUrl();

    if (!asaasApiKey) {
        throw new Error('ASAAS_API_KEY não está configurada no servidor.');
    }

    try {
        // Passo 1: Criar a cobrança (Payment)
        const paymentPayload = {
            customer: data.customerId,
            billingType: data.billingType,
            value: data.value,
            dueDate: new Date(new Date().setDate(new Date().getDate() + 3)).toISOString().split('T')[0], // Vence em 3 dias
            description: `Cobrança de teste para ${data.billingType}`,
            externalReference: data.userId, // VINCULANDO O PAGAMENTO AO NOSSO USER ID
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

        // Passo 2: Buscar os dados específicos (QR Code ou Linha Digitável)
        if (data.billingType === 'PIX') {
            const qrCodeResponse = await fetch(`${asaasApiUrl}/payments/${chargeId}/pixQrCode`, {
                headers: { 'access_token': asaasApiKey },
                cache: 'no-store',
            });
            const qrCodeData = await qrCodeResponse.json();
            if (!qrCodeResponse.ok) throw new Error(qrCodeData.errors?.[0]?.description || 'Falha ao obter QR Code.');
            return { type: 'PIX', ...qrCodeData };
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
                identificationField: identificationFieldData.identificationField,
                bankSlipUrl: paymentData.bankSlipUrl // URL para o PDF do boleto
            };
        }

    } catch (error: any) {
        console.error('Error in createPaymentAction:', error);
        throw new Error(error.message || 'Erro desconhecido ao criar a cobrança.');
    }
}
