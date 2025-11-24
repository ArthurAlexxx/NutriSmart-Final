// src/app/actions/billing-actions.ts
'use server';
import { db } from '@/lib/firebase/admin';
import type { UserProfile } from '@/types/user';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { addMonths, addYears } from 'date-fns';

/**
 * Updates a user's subscription status in Firestore.
 * This action is called by a trusted server process (like a webhook) which has admin privileges.
 * @param userId - The ID of the user to update.
 * @param planName - The name of the plan to assign ('PREMIUM' or 'PROFISSIONAL').
 * @param billingCycle - The billing cycle ('monthly' or 'yearly').
 * @returns An object indicating success or failure.
 */
export async function updateUserSubscriptionAction(
    userId: string, 
    planName: 'PREMIUM' | 'PROFISSIONAL',
    billingCycle: 'monthly' | 'yearly'
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

    const abacateApiKey = process.env.ABACATE_PAY_API_KEY;
    if (!abacateApiKey) {
        console.error("ABACATE_PAY_API_KEY is not configured on the server.");
        return { success: false, message: "Gateway de pagamento não configurado." };
    }

    try {
        // 1. Verify payment with AbacatePay
        const abacateApiUrl = `https://api.abacatepay.com/v1/pixQrCode/check?id=${chargeId}`;
        const response = await fetch(abacateApiUrl, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${abacateApiKey}` },
            cache: 'no-store',
        });

        const data = await response.json();

        if (!response.ok || data.data?.status !== 'PAID') {
            return { success: false, message: "Pagamento não confirmado ou ainda pendente." };
        }
        
        const metadata = data.data?.pixQrCode?.metadata;
        if (!metadata || metadata.externalId !== userId) {
             return { success: false, message: "Metadados de pagamento inválidos ou não correspondem ao usuário." };
        }
        
        const planName = metadata.plan as 'PREMIUM' | 'PROFISSIONAL';
        const billingCycle = metadata.billingCycle as 'monthly' | 'yearly';
        
        // 2. Update user document in Firestore using the Admin SDK
        // This leverages the server's admin privileges via our robust admin initialization.
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
 * Cancels a user's subscription by setting their status to 'free'.
 * @param userId The ID of the user whose subscription is to be cancelled.
 * @returns An object indicating success or failure.
 */
export async function cancelSubscriptionAction(userId: string): Promise<{ success: boolean, message: string }> {
  if (!userId) {
    return { success: false, message: 'UserID inválido.' };
  }

  try {
    const userRef = db.collection('users').doc(userId);
    // Setting status to 'free' and expiresAt to now effectively cancels the subscription benefits.
    // A more complex setup might keep benefits until the end of the billing cycle.
    await userRef.update({
      subscriptionStatus: 'free',
      subscriptionExpiresAt: Timestamp.now(),
    });

    return { success: true, message: 'Assinatura cancelada com sucesso.' };

  } catch (error: any) {
    console.error(`Falha ao cancelar a assinatura para o usuário ${userId}:`, error);
    return { success: false, message: error.message || 'Erro desconhecido ao cancelar a assinatura.' };
  }
}
