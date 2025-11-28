// src/app/api/webhooks/asaas/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/lib/firebase/admin';
import { updateUserSubscriptionAction, cancelSubscriptionAction } from '@/app/actions/billing-actions';

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

async function getUserIdFromAsaas(payload: any): Promise<string | null> {
    // 1. Prioritize externalReference on the payment/subscription object itself.
    let userId = payload?.payment?.externalReference || payload?.subscription?.externalReference;
    if (userId) return userId;

    // 2. If not found, get the customer ID and fetch the customer data.
    const customerId = payload?.payment?.customer || payload?.subscription?.customer;
    if (!customerId) return null;

    try {
        const asaasApiKey = process.env.ASAAS_API_KEY;
        const asaasApiUrl = getAsaasApiUrl();
        const customerResponse = await fetch(`${asaasApiUrl}/customers/${customerId}`, {
            headers: { 'access_token': asaasApiKey },
            cache: 'no-store'
        });
        if (!customerResponse.ok) {
             throw new Error(`Asaas API returned ${customerResponse.status} for customer ${customerId}`);
        }
        const customerData = await customerResponse.json();
        return customerData.externalReference || null;
    } catch (fetchError: any) {
        console.error(`Error fetching customer from Asaas: ${fetchError.message}`);
        return null;
    }
}


async function handlePayment(event: any) {
    const paymentData = event.payment;
    if (!paymentData) {
        const message = `Evento de pagamento ignorado: payload não contém o objeto 'payment'.`;
        await saveWebhookLog(event, 'SUCCESS', message);
        return;
    }
    
    const userId = await getUserIdFromAsaas(event);
    if (!userId) {
        await saveWebhookLog(event, 'FAILURE', `Webhook de pagamento para customer ${paymentData.customer} sem externalReference.`);
        return;
    }

    const { planName, billingCycle } = extractPlanInfoFromDescription(paymentData?.description);
    
    if (userId && planName && billingCycle) {
        try {
            const updateResult = await updateUserSubscriptionAction(userId, planName, billingCycle);
            if (updateResult.success) {
                await saveWebhookLog(event, 'SUCCESS', updateResult.message);
            } else {
                await saveWebhookLog(event, 'FAILURE', updateResult.message);
            }
        } catch (dbError: any) {
            await saveWebhookLog(event, 'FAILURE', `Falha ao atualizar usuário ${userId}: ${dbError.message}`);
        }
    } else {
        const message = `Webhook de pagamento recebido, mas dados cruciais não foram extraídos. UserID: ${userId}, Descrição: ${paymentData?.description}.`;
        await saveWebhookLog(event, 'SUCCESS', message);
    }
}

async function handleSubscription(event: any) {
    const subscriptionData = event.subscription;
    if (!subscriptionData) {
        const message = `Evento de assinatura ignorado: payload não contém o objeto 'subscription'.`;
        await saveWebhookLog(event, 'SUCCESS', message);
        return;
    }
    
    const userId = await getUserIdFromAsaas(event);
    if (!userId) {
        await saveWebhookLog(event, 'FAILURE', `Webhook de assinatura para customer ${subscriptionData.customer} sem externalReference.`);
        return;
    }

    // Handle subscription cancellation/inactivation
    if (event.event === 'SUBSCRIPTION_INACTIVATED' || event.event === 'SUBSCRIPTION_DELETED' || (event.event === 'SUBSCRIPTION_UPDATED' && subscriptionData.status === 'INACTIVE')) {
        try {
            const result = await cancelSubscriptionAction(userId);
            if (result.success) {
                 await saveWebhookLog(event, 'SUCCESS', `Assinatura cancelada para usuário ${userId} devido ao evento ${event.event}.`);
            } else {
                 await saveWebhookLog(event, 'FAILURE', `Falha ao cancelar assinatura para ${userId}: ${result.message}`);
            }
        } catch(error: any) {
             await saveWebhookLog(event, 'FAILURE', `Erro crítico ao processar cancelamento para ${userId}: ${error.message}`);
        }
    } else {
         const message = `Evento de assinatura '${event.event}' recebido e ignorado por não ser uma ação de cancelamento.`;
         await saveWebhookLog(event, 'SUCCESS', message);
    }
}


export async function POST(request: NextRequest) {
  let event;
  try {
    event = await request.json();
  } catch (error: any) {
      const errorMessage = `Erro fatal ao fazer parse do corpo do webhook: ${error.message}`;
      await saveWebhookLog({body: "Invalid JSON"}, 'FAILURE', errorMessage);
      return new NextResponse('Payload malformado.', { status: 400 });
  }

  const eventName = event?.event;
  if (!eventName) {
    await saveWebhookLog(event, 'FAILURE', 'Evento ignorado: campo "event" ausente no payload.');
    return NextResponse.json({ message: "Webhook recebido (sem evento)." }, { status: 200 });
  }
    
  if (eventName.startsWith('PAYMENT_')) {
      const successfulPaymentEvents = ['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED'];
      if (successfulPaymentEvents.includes(eventName)) {
        await handlePayment(event);
      } else {
        await saveWebhookLog(event, 'SUCCESS', `Evento de pagamento '${eventName}' não processado.`);
      }
  } else if (eventName.startsWith('SUBSCRIPTION_')) {
      await handleSubscription(event);
  } else {
      await saveWebhookLog(event, 'SUCCESS', `Tipo de evento '${eventName}' desconhecido e não processado.`);
  }
      
  return NextResponse.json({ message: "Webhook recebido com sucesso." }, { status: 200 });
}

export async function GET() {
    return NextResponse.json({ message: 'Endpoint de webhook do Asaas. Use POST para enviar dados.' }, { status: 200 });
}
