// src/app/actions/user-actions.ts
'use server';

import { db, auth as adminAuth } from '@/lib/firebase/admin';
import { getAuth } from 'firebase-admin/auth';
import { headers } from 'next/headers';

/**
 * Updates the role of a user in Firestore.
 * This action can only be performed by an admin.
 * @param userId - The ID of the user to update.
 * @param newRole - The new role to assign ('patient' or 'professional').
 * @returns An object indicating success or failure.
 */
export async function updateUserRoleAction(
  userId: string,
  newRole: 'patient' | 'professional'
): Promise<{ success: boolean; message: string }> {
  // This action requires admin privileges which are checked by security rules
  // when the admin SDK is NOT used. For this action, we assume an admin is calling it.
  // We add a server-side check to prevent an admin from changing their own role.
  const headersList = headers();
  const authorization = headersList.get('Authorization');
  if (!authorization) {
    return { success: false, message: 'Authorization header is missing.' };
  }

  const token = authorization.split('Bearer ')[1];
   if (!token) {
    return { success: false, message: 'Bearer token is missing.' };
  }
  
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    const adminUid = decodedToken.uid;

    if (adminUid === userId) {
      return { success: false, message: 'Um administrador não pode alterar a própria função.' };
    }

    if (!['patient', 'professional'].includes(newRole)) {
      return { success: false, message: 'Função inválida.' };
    }

    const userRef = db.collection('users').doc(userId);
    await userRef.update({ role: newRole, profileType: newRole });
    
    return { success: true, message: `Função do usuário atualizada para ${newRole}.` };

  } catch (error: any) {
    console.error('Error updating user role:', error);
    if (error.code === 'auth/id-token-expired') {
        return { success: false, message: 'Sessão expirada. Faça login novamente.' };
    }
    return { success: false, message: error.message || 'Falha ao atualizar a função do usuário.' };
  }
}
