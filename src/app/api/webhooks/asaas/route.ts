// src/app/api/webhooks/asaas/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/lib/firebase/admin';
import { updateUserSubscriptionAction, cancelSubscriptionAction } from '@/app/actions/billing-actions';
import type { UserProfile } from '@/types/user';
import { CollectionReference } from 'firebase-admin/firestore';

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
    const metadataUserId = payload?.payment?.metadata?.userId;
    if (metadataUserId) return metadataUserId;

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
    const usersRef = db.collection('users') as CollectionReference<UserProfile>;
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


async function handlePaymentReceived(event: any) {
    const paymentData = event.payment;
    if (!paymentData) {
        return; // Should have been logged before calling this
    }
    
    const userId = await getUserIdFromAsaas(event);
    if (!userId) {
        await saveWebhookLog(event, 'FAILURE', `Webhook de pagamento recebido, mas não foi possível encontrar o userId para o customer ${paymentData.customer}.`);
        return;
    }

    // Prioritize metadata for plan info
    const metadata = paymentData.metadata;
    const planNameFromMeta = metadata?.plan as 'PREMIUM' | 'PROFISSIONAL' | null;
    const billingCycleFromMeta = metadata?.billingCycle as 'monthly' | 'yearly' | null;
    
    let planName = planNameFromMeta;
    let billingCycle = billingCycleFromMeta;

    // Fallback to description if metadata is missing
    if (!planName || !billingCycle) {
        const fromDescription = extractPlanInfoFromDescription(paymentData.description);
        if (!planName) planName = fromDescription.planName;
        if (!billingCycle) billingCycle = fromDescription.billingCycle;
    }
    

    if (planName && billingCycle) {
        const updateResult = await updateUserSubscriptionAction(userId, planName, billingCycle, paymentData?.subscription);
         if (updateResult.success) {
            await saveWebhookLog(event, 'SUCCESS', `PAYMENT_RECEIVED - Assinatura atualizada para ${userId} via pagamento.`);
        } else {
            await saveWebhookLog(event, 'FAILURE', `PAYMENT_RECEIVED - Falha ao atualizar assinatura para ${userId}: ${updateResult.message}`);
        }
    } else {
        const failureMessage = `PAYMENT_RECEIVED - Webhook recebido para UserID ${userId}, mas os dados do plano não foram encontrados nos metadados ou na descrição.`;
        await saveWebhookLog(event, 'FAILURE', failureMessage);
    }
}

async function handleSubscriptionInactivated(event: any) {
    const subscriptionData = event.subscription;
    if (!subscriptionData) {
        return;
    }
    
    const userId = await getUserIdFromAsaas(event);
    if (!userId) {
        await saveWebhookLog(event, 'FAILURE', `Webhook de assinatura inativada recebido, mas não foi possível encontrar o userId para o customer ${subscriptionData.customer}.`);
        return;
    }

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

  // Log every event first, regardless of processing logic.
  await saveWebhookLog(event, 'SUCCESS', `Evento '${eventName}' recebido e logado.`);
    
  // Then, process specific events
  if (eventName === 'PAYMENT_RECEIVED' || eventName === 'PAYMENT_CONFIRMED' || eventName === 'CHECKOUT_PAID') {
      await handlePaymentReceived(event);
  } else if (eventName === 'SUBSCRIPTION_INACTIVATED' || eventName === 'SUBSCRIPTION_DELETED' || (eventName === 'SUBSCRIPTION_UPDATED' && event.subscription?.status === 'INACTIVE')) {
      await handleSubscriptionInactivated(event);
  }
      
  return NextResponse.json({ message: "Webhook recebido com sucesso." }, { status: 200 });
}

export async function GET() {
    return NextResponse.json({ message: 'Endpoint de webhook do Asaas. Use POST para enviar dados.' }, { status: 200 });
}
