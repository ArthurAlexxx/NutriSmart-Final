
// src/app/api/webhooks/asaas/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/lib/firebase/admin';
import { updateUserSubscriptionAction, cancelSubscriptionAction } from '@/app/actions/billing-actions';
import type { UserProfile } from '@/types/user';
import { query, where } from 'firebase/firestore';

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
    const directPaymentReference = payload?.payment?.externalReference;
    if (directPaymentReference) return directPaymentReference;
    
    const directSubscriptionReference = payload?.subscription?.externalReference;
    if (directSubscriptionReference) return directSubscriptionReference;
    
    const directCustomerReference = payload?.customer?.externalReference;
    if (directCustomerReference) return directCustomerReference;

    const customerId = payload?.payment?.customer || payload?.subscription?.customer || payload?.customer?.id;
    if (!customerId) {
        return null;
    }

    // If we couldn't find the externalReference directly, query the customer from our DB
    const usersRef = db.collection('users');
    const q = usersRef.where('asaasCustomerId', '==', customerId);
    const querySnapshot = await q.get();

    if (!querySnapshot.empty) {
        return querySnapshot.docs[0].id;
    }
    
    // As a last resort, query Asaas API
    try {
        const asaasApiKey = process.env.ASAAS_API_KEY;
        const asaasApiUrl = getAsaasApiUrl();
        const response = await fetch(`${asaasApiUrl}/customers/${customerId}`, {
            headers: { 'access_token': asaasApiKey },
            cache: 'no-store'
        });

        if (!response.ok) {
             const errorText = await response.text();
             console.error(`Asaas API Error fetching customer ${customerId}: ${errorText}`);
             return null;
        }

        const customerData = await response.json();
        return customerData.externalReference || null;
    } catch (fetchError: any) {
        console.error(`Error fetching customer from Asaas: ${fetchError.message}`);
        return null;
    }
}


async function handlePayment(event: any) {
    const paymentData = event.payment;
    if (!paymentData) {
        await saveWebhookLog(event, 'SUCCESS', `Evento de pagamento ignorado: payload não contém o objeto 'payment'.`);
        return;
    }
    
    const userId = await getUserIdFromAsaas(event);
    if (!userId) {
        await saveWebhookLog(event, 'FAILURE', `Webhook de pagamento recebido, mas não foi possível encontrar o userId para o customer ${paymentData.customer}.`);
        return;
    }

    const { planName, billingCycle } = extractPlanInfoFromDescription(paymentData?.description);
    const asaasSubscriptionId = paymentData?.subscription;
    
    if (planName && billingCycle) {
        try {
            const updateResult = await updateUserSubscriptionAction(userId, planName, billingCycle, asaasSubscriptionId);
            if (updateResult.success) {
                await saveWebhookLog(event, 'SUCCESS', updateResult.message);
            } else {
                await saveWebhookLog(event, 'FAILURE', updateResult.message);
            }
        } catch (dbError: any) {
            await saveWebhookLog(event, 'FAILURE', `Falha crítica ao atualizar usuário ${userId}: ${dbError.message}`);
        }
    } else {
        await saveWebhookLog(event, 'FAILURE', `Webhook de pagamento recebido para UserID ${userId}, mas os dados do plano não foram extraídos da descrição.`);
    }
}

async function handleSubscription(event: any) {
    const subscriptionData = event.subscription;
    if (!subscriptionData) {
        await saveWebhookLog(event, 'SUCCESS', `Evento de assinatura ignorado: payload não contém o objeto 'subscription'.`);
        return;
    }
    
    const userId = await getUserIdFromAsaas(event);
    if (!userId) {
        await saveWebhookLog(event, 'FAILURE', `Webhook de assinatura recebido, mas não foi possível encontrar o userId para o customer ${subscriptionData.customer}.`);
        return;
    }

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
  } else if (eventName.startsWith('CHECKOUT_')) {
      if (eventName === 'CHECKOUT_PAID') {
        // O payload de CHECKOUT_PAID contém o objeto 'payment', então podemos reutilizar o handler.
        await handlePayment(event);
      } else {
        await saveWebhookLog(event, 'SUCCESS', `Evento de checkout '${eventName}' não processado.`);
      }
  } else {
      await saveWebhookLog(event, 'SUCCESS', `Tipo de evento '${eventName}' desconhecido e não processado.`);
  }
      
  return NextResponse.json({ message: "Webhook recebido com sucesso." }, { status: 200 });
}

export async function GET() {
    return NextResponse.json({ message: 'Endpoint de webhook do Asaas. Use POST para enviar dados.' }, { status: 200 });
}
