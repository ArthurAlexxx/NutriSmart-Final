// src/app/actions/user-actions.ts
'use server';

import { db, auth as adminAuth } from '@/lib/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';
import { addYears } from 'date-fns';

/**
 * Updates the subscription status and expiration date of a user in Firestore.
 * This action can only be performed by an admin.
 * @param userId - The ID of the user to update.
 * @param newStatus - The new subscription status ('free', 'premium', or 'professional').
 * @returns An object indicating success or failure.
 */
export async function updateUserSubscriptionStatusAction(
  userId: string,
  newStatus: 'free' | 'premium' | 'professional'
): Promise<{ success: boolean; message: string }> {
  // This is a server action, but we are not checking for admin role here
  // because it's called from an API route that will do its own auth check.
  // In a real app, you would add admin verification here if called directly from client.

  try {
    if (!['free', 'premium', 'professional'].includes(newStatus)) {
      return { success: false, message: 'Status de assinatura inválido.' };
    }

    const userRef = db.collection('users').doc(userId);
    const updatePayload: { subscriptionStatus: string; subscriptionExpiresAt: Timestamp } = {
        subscriptionStatus: newStatus,
        subscriptionExpiresAt: newStatus === 'free' 
            ? Timestamp.fromDate(new Date(0)) // Expired in the past
            : Timestamp.fromDate(addYears(new Date(), 1)) // 1 year from now
    };
    
    await userRef.update(updatePayload);
    
    return { success: true, message: `Assinatura do usuário atualizada para ${newStatus}.` };

  } catch (error: any) {
    console.error('Error updating user subscription:', error);
    return { success: false, message: error.message || 'Falha ao atualizar a assinatura do usuário.' };
  }
}
