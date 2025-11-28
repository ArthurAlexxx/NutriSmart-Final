
// src/app/api/webhooks/asaas/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/lib/firebase/admin';
import { updateUserSubscriptionAction } from '@/app/actions/billing-actions';

export const dynamic = 'force-dynamic';

const getAsaasApiUrl = () => {
    const asaasApiKey = process.env.ASAAS_API_KEY;
    const isSandbox = asaasApiKey?.includes('sandbox') || asaasApiKey?.includes('hmlg');
    return isSandbox ? 'https://sandbox.asaas.com/api/v3' : 'https://api.asaas.com/v3';
};


async function saveWebhookLog(payload: any, status: 'SUCCESS' | 'FAILURE', details: string) {
    try {
        const logData = {
            payload: payload || { info: 'Payload not available' },
            status: status,
            details: details,
            createdAt: new Date(),
        };
        await db.collection('webhook_logs').add(logData);
    } catch (logError: any) {
        console.error("CRITICAL: Failed to save webhook log.", logError.message);
    }
}

function extractPlanInfoFromDescription(description: string): { planName: 'PREMIUM' | 'PROFISSIONAL' | null, billingCycle: 'monthly' | 'yearly' | null } {
    if (!description) return { planName: null, billingCycle: null };
    
    const lowerCaseDesc = description.toLowerCase();
    
    let planName: 'PREMIUM' | 'PROFISSIONAL' | null = null;
    if (lowerCaseDesc.includes('premium')) {
        planName = 'PREMIUM';
    } else if (lowerCaseDesc.includes('profissional')) {
        planName = 'PROFISSIONAL';
    }

    let billingCycle: 'monthly' | 'yearly' | null = null;
    if (lowerCaseDesc.includes('anual')) {
        billingCycle = 'yearly';
    } else if (lowerCaseDesc.includes('mensal')) {
        billingCycle = 'monthly';
    }

    return { planName, billingCycle };
}


async function handlePayment(event: any) {
    const eventName = event?.event;
    if (!eventName) {
        const message = 'Evento ignorado: campo "event" ausente no payload.';
        await saveWebhookLog(event, 'SUCCESS', message);
        console.log(message);
        return;
    }

    const successfulPaymentEvents = ['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED'];
    if (!successfulPaymentEvents.includes(eventName)) {
        const message = `Evento não processado: ${eventName}`;
        await saveWebhookLog(event, 'SUCCESS', message); // Log as success because we correctly ignored it
        console.log(message);
        return;
    }

    const paymentData = event.payment;
    if (!paymentData) {
        const message = `Evento ${eventName} ignorado: payload não contém o objeto 'payment'.`;
        await saveWebhookLog(event, 'SUCCESS', message);
        console.log(message);
        return;
    }
    
    let userId = paymentData?.externalReference;
    
    // Fallback: If externalReference is not on the payment, fetch it from the customer.
    if (!userId && paymentData.customer) {
        try {
            const asaasApiKey = process.env.ASAAS_API_KEY;
            const asaasApiUrl = getAsaasApiUrl();
            const customerResponse = await fetch(`${asaasApiUrl}/customers/${paymentData.customer}`, {
                headers: { 'access_token': asaasApiKey },
                cache: 'no-store'
            });
            const customerData = await customerResponse.json();
            userId = customerData.externalReference;
            if (!userId) {
                 await saveWebhookLog(event, 'FAILURE', `Webhook de pagamento para customer ${paymentData.customer} sem externalReference.`);
                 return;
            }
        } catch (fetchError: any) {
            await saveWebhookLog(event, 'FAILURE', `Erro ao buscar cliente no Asaas: ${fetchError.message}`);
            return;
        }
    }

    const { planName, billingCycle } = extractPlanInfoFromDescription(paymentData?.description);
    
    if (userId && planName && billingCycle) {
        try {
            const updateResult = await updateUserSubscriptionAction(userId, planName, billingCycle);
            if (updateResult.success) {
                await saveWebhookLog(event, 'SUCCESS', updateResult.message);
            } else {
                await saveWebhookLog(event, 'FAILURE', updateResult.message);
                console.error(`Falha na lógica de negócio ao processar webhook: ${updateResult.message}`);
            }
        } catch (dbError: any) {
            const errorMessage = `Falha ao atualizar usuário ${userId} via Server Action: ${dbError.message}`;
            console.error(errorMessage);
            await saveWebhookLog(event, 'FAILURE', errorMessage);
        }
    } else {
        // Log a warning if essential data is missing, but still treat as a "handled" case.
        const message = `Webhook de pagamento recebido, mas dados cruciais não puderam ser extraídos. externalReference: ${userId}, description: ${paymentData?.description}.`;
        console.warn(message, { payload: event });
        await saveWebhookLog(event, 'SUCCESS', message);
    }
}

export async function POST(request: NextRequest) {
  let event;
  try {
    event = await request.json();
  } catch (error: any) {
      const errorMessage = `Erro fatal ao fazer parse do corpo do webhook: ${error.message}`;
      console.error(errorMessage);
      await saveWebhookLog({body: "Invalid JSON"}, 'FAILURE', errorMessage);
      return new NextResponse('Payload malformado.', { status: 400 });
  }
    
  // Process the payment logic without signature verification for now
  await handlePayment(event);
      
  // Always return a success response to Asaas to prevent retries.
  return NextResponse.json({ message: "Webhook recebido com sucesso." }, { status: 200 });
}

export async function GET() {
    return NextResponse.json({ message: 'Endpoint de webhook do Asaas. Use POST para enviar dados.' }, { status: 200 });
}
