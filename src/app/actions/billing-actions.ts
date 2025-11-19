// src/app/actions/billing-actions.ts
'use server';
import { db } from '@/lib/firebase/admin';

/**
 * Updates a user's subscription status in Firestore.
 * This action is intended to be called by a trusted server-side process, like a webhook handler.
 * @param userId - The ID of the user to update.
 * @param planName - The name of the plan to assign ('PREMIUM' or 'PROFISSIONAL').
 * @returns An object indicating success or failure.
 */
export async function updateUserSubscriptionAction(userId: string, planName: 'PREMIUM' | 'PROFISSIONAL'): Promise<{ success: boolean; message: string }> {
  if (!userId || !planName) {
    return { success: false, message: 'User ID ou nome do plano inválido.' };
  }

  let newSubscriptionStatus: 'premium' | 'professional' | 'free' = 'free';
  if (planName === 'PREMIUM') {
    newSubscriptionStatus = 'premium';
  } else if (planName === 'PROFISSIONAL') {
    newSubscriptionStatus = 'professional';
  } else {
    return { success: false, message: `Plano desconhecido: ${planName}` };
  }

  try {
    const userRef = db.collection('users').doc(userId);
    await userRef.update({ subscriptionStatus: newSubscriptionStatus });
    const successMessage = `Assinatura do usuário ${userId} atualizada para ${newSubscriptionStatus}.`;
    console.log(successMessage);
    return { success: true, message: successMessage };
  } catch (error: any) {
    const errorMessage = `Falha ao atualizar usuário ${userId} no banco de dados: ${error.message}`;
    console.error(errorMessage);
    // Return a failed promise to be caught by the caller
    return Promise.reject(new Error(errorMessage));
  }
}

/**
 * Verifies a chargeId and updates the user's subscription if the payment is confirmed.
 * This action is called from the client-side and uses the user's own permissions.
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
            return { success: false, message: "Pagamento não confirmado." };
        }
        
        const metadata = data.data?.pixQrCode?.metadata;
        if (!metadata || metadata.externalId !== userId) {
             return { success: false, message: "Metadados de pagamento inválidos ou não correspondem ao usuário." };
        }
        
        const planName = metadata.plan as 'PREMIUM' | 'PROFISSIONAL';
        let newSubscriptionStatus: 'premium' | 'professional' = 'premium';
        if (planName === 'PROFISSIONAL') {
            newSubscriptionStatus = 'professional';
        }

        // 2. Update user document in Firestore
        // This write will succeed because it's initiated by a server action,
        // which should use admin privileges implicitly.
        const userRef = db.collection('users').doc(userId);
        await userRef.update({ subscriptionStatus: newSubscriptionStatus });
        
        return { success: true, message: `Assinatura atualizada para ${newSubscriptionStatus}.` };

    } catch (error: any) {
        console.error("Error finalizing subscription:", error);
        return { success: false, message: error.message || "Erro desconhecido ao finalizar a assinatura." };
    }
}
