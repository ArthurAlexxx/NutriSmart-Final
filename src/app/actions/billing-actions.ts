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
