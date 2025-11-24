// src/app/actions/user-actions.ts
'use server';

import { db, auth as adminAuth } from '@/lib/firebase/admin';
import { headers } from 'next/headers';
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
  // This action requires admin privileges which are checked by verifying the ID token.
  const headersList = headers();
  const authorization = headersList.get('Authorization');
  if (!authorization) {
    return { success: false, message: 'Cabeçalho de autorização ausente.' };
  }

  const token = authorization.split('Bearer ')[1];
   if (!token) {
    return { success: false, message: 'Token de autorização ausente.' };
  }
  
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    const adminUid = decodedToken.uid;

    const adminUserDoc = await db.collection('users').doc(adminUid).get();
    if (!adminUserDoc.exists || adminUserDoc.data()?.role !== 'admin') {
      return { success: false, message: 'Ação não autorizada. Apenas administradores podem alterar assinaturas.' };
    }

    if (adminUid === userId) {
      return { success: false, message: 'Um administrador não pode alterar a própria assinatura.' };
    }

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
    if (error.code === 'auth/id-token-expired') {
        return { success: false, message: 'Sessão expirada. Faça login novamente.' };
    }
    return { success: false, message: error.message || 'Falha ao atualizar a assinatura do usuário.' };
  }
}
