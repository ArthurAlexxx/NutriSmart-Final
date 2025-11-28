// src/app/actions/billing-actions.ts
'use server';
import { db } from '@/lib/firebase/admin';
import type { UserProfile } from '@/types/user';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { addMonths, addYears } from 'date-fns';

const getAsaasApiUrl = () => {
    const asaasApiKey = process.env.ASAAS_API_KEY;
    const isSandbox = asaasApiKey?.includes('sandbox') || asaasApiKey?.includes('hmlg');
    return isSandbox ? 'https://sandbox.asaas.com/api/v3' : 'https://api.asaas.com/v3';
};


/**
 * Cancels a subscription in the Asaas payment gateway.
 * @param subscriptionId The Asaas subscription ID to cancel.
 * @returns An object indicating success or failure.
 */
async function cancelAsaasSubscription(subscriptionId: string): Promise<{ success: boolean; message: string }> {
    const asaasApiKey = process.env.ASAAS_API_KEY;
    if (!asaasApiKey) {
        return { success: false, message: 'Gateway de pagamento não configurado no servidor.' };
    }

    try {
        const response = await fetch(`${getAsaasApiUrl()}/subscriptions/${subscriptionId}`, {
            method: 'DELETE',
            headers: { 'access_token': asaasApiKey },
            cache: 'no-store'
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.errors?.[0]?.description || `Falha ao cancelar assinatura no Asaas: ${response.statusText}`);
        }
        
        return { success: true, message: 'Assinatura cancelada com sucesso no Asaas.' };

    } catch (error: any) {
        console.error('Erro ao cancelar assinatura no Asaas:', error);
        return { success: false, message: error.message };
    }
}


/**
 * Updates a user's subscription status in Firestore.
 * This action is called by a trusted server process (like a webhook) which has admin privileges.
 * @param userId - The ID of the user to update.
 * @param planName - The name of the plan to assign ('PREMIUM' or 'PROFISSIONAL').
 * @param billingCycle - The billing cycle ('monthly' or 'yearly').
 * @param asaasSubscriptionId - The subscription ID from Asaas.
 * @returns An object indicating success or failure.
 */
export async function updateUserSubscriptionAction(
    userId: string, 
    planName: 'PREMIUM' | 'PROFISSIONAL',
    billingCycle: 'monthly' | 'yearly',
    asaasSubscriptionId?: string
): Promise<{ success: boolean; message: string }> {
  if (!userId || !planName || !billingCycle) {
    return { success: false, message: 'User ID, nome do plano ou ciclo de cobrança inválido.' };
  }

  const now = new Date();
  const expirationDate = billingCycle === 'yearly' ? addYears(now, 1) : addMonths(now, 1);
  const expirationTimestamp = Timestamp.fromDate(expirationDate);

  try {
    const userRef = db.collection('users').doc(userId);
    
    const updatePayload: Partial<UserProfile> = {
        subscriptionExpiresAt: expirationTimestamp,
    };

    if (planName === 'PREMIUM') {
        updatePayload.subscriptionStatus = 'premium';
    } else if (planName === 'PROFISSIONAL') {
        updatePayload.subscriptionStatus = 'professional';
    } else {
        return { success: false, message: 'Nome do plano desconhecido.'};
    }
    
    if (asaasSubscriptionId) {
        updatePayload.asaasSubscriptionId = asaasSubscriptionId;
    }

    await userRef.update(updatePayload);

    const successMessage = `Assinatura do usuário ${userId} atualizada para ${updatePayload.subscriptionStatus} até ${expirationDate.toISOString()}.`;
    console.log(successMessage);
    return { success: true, message: successMessage };
  } catch (error: any) {
    const errorMessage = `Falha ao atualizar usuário ${userId} no banco de dados: ${error.message}`;
    console.error(errorMessage, error); // Log the full error for more context
    return { success: false, message: errorMessage };
  }
}

/**
 * Verifies a chargeId against the payment gateway and, if successful,
 * updates the user's subscription status in Firestore.
 * This action is initiated from the client-side but runs on the server.
 * @param userId - The ID of the user to update.
 * @param chargeId - The payment charge ID to verify.
 * @returns An object indicating success or failure.
 */
export async function verifyAndFinalizeSubscription(userId: string, chargeId: string): Promise<{ success: boolean; message: string; }> {
    if (!userId || !chargeId) {
        return { success: false, message: "UserID ou ChargeID inválido." };
    }

    const asaasApiKey = process.env.ASAAS_API_KEY;

    if (!asaasApiKey) {
        console.error("ASAAS_API_KEY is not configured on the server.");
        return { success: false, message: "Gateway de pagamento não configurado." };
    }

    try {
        const response = await fetch(`${getAsaasApiUrl()}/payments/${chargeId}`, {
            method: 'GET',
            headers: { 'access_token': asaasApiKey },
            cache: 'no-store',
        });

        const data = await response.json();

        const paidStatuses = ['RECEIVED', 'CONFIRMED'];
        if (!response.ok || !paidStatuses.includes(data.status)) {
            return { success: false, message: "Pagamento não confirmado ou ainda pendente." };
        }
        
        if (data.externalReference !== userId) {
             return { success: false, message: "Dados de pagamento inválidos ou não correspondem ao usuário." };
        }
        
        const { planName, billingCycle } = extractPlanInfoFromDescription(data.description);
        
        if (!planName || !billingCycle) {
            return { success: false, message: "Não foi possível determinar o plano a partir da descrição do pagamento." };
        }

        const updateResult = await updateUserSubscriptionAction(userId, planName, billingCycle);

        if (updateResult.success) {
            return { success: true, message: `Assinatura atualizada para ${planName} com sucesso.` };
        } else {
            throw new Error(updateResult.message);
        }

    } catch (error: any) {
        console.error("Erro ao finalizar a assinatura:", error);
        return { success: false, message: error.message || "Erro desconhecido ao finalizar a assinatura." };
    }
}

/**
 * Cancels a user's subscription by setting their status to 'free' and cancelling on Asaas.
 * @param userId The ID of the user whose subscription is to be cancelled.
 * @returns An object indicating success or failure.
 */
export async function cancelSubscriptionAction(userId: string): Promise<{ success: boolean, message: string }> {
  if (!userId) {
    return { success: false, message: 'UserID inválido.' };
  }

  try {
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
        return { success: false, message: 'Usuário não encontrado.' };
    }

    const userData = userDoc.data() as UserProfile;
    const asaasSubscriptionId = userData.asaasSubscriptionId;

    if (asaasSubscriptionId) {
        const asaasResult = await cancelAsaasSubscription(asaasSubscriptionId);
        if (!asaasResult.success) {
            // Log the error but continue to cancel locally
            console.error(`Falha ao cancelar assinatura no Asaas para ${userId}: ${asaasResult.message}`);
        }
    }
    
    await userRef.update({
      subscriptionStatus: 'free',
      subscriptionExpiresAt: Timestamp.now(),
      asaasSubscriptionId: FieldValue.delete(), // Remove o ID da assinatura do Asaas
    });

    return { success: true, message: 'Assinatura cancelada com sucesso.' };

  } catch (error: any) {
    console.error(`Falha ao cancelar a assinatura para o usuário ${userId}:`, error);
    return { success: false, message: error.message || 'Erro desconhecido ao cancelar a assinatura.' };
  }
}
