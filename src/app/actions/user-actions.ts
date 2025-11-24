// src/app/actions/user-actions.ts
'use server';

import { db, auth as adminAuth } from '@/lib/firebase/admin';
import { revalidatePath } from 'next/cache';
import type { UserProfile } from '@/types/user';
import { Timestamp } from 'firebase-admin/firestore';

/**
 * Pauses a user's account by setting their status to 'paused'.
 * @param userId The ID of the user to pause.
 * @returns An object indicating success or failure.
 */
export async function pauseAccountAction(userId: string): Promise<{ success: boolean; message: string }> {
    if (!userId) {
        return { success: false, message: 'ID do usuário não fornecido.' };
    }

    try {
        const userRef = db.collection('users').doc(userId);
        await userRef.update({ status: 'paused' });
        
        // This won't immediately log the user out but will prevent access on next session validation.
        // For immediate effect, client-side should handle logout.
        return { success: true, message: 'Sua conta foi pausada.' };
    } catch (error: any) {
        console.error(`Error pausing account for user ${userId}:`, error);
        return { success: false, message: error.message || 'Não foi possível pausar a conta.' };
    }
}


/**
 * Deletes a user's account and all associated data permanently.
 * @param userId The ID of the user to delete.
 * @returns An object indicating success or failure.
 */
export async function deleteAccountAction(userId: string): Promise<{ success: boolean; message: string }> {
    if (!userId) {
        return { success: false, message: 'ID do usuário não fornecido.' };
    }

    try {
        // Step 1: Delete all subcollections recursively
        const collections = await db.collection('users').doc(userId).listCollections();
        for (const collection of collections) {
            const snapshot = await collection.get();
            if (!snapshot.empty) {
                const batch = db.batch();
                snapshot.docs.forEach(doc => {
                    batch.delete(doc.ref);
                });
                await batch.commit();
            }
        }
        
        // Step 2: Delete the main user document from Firestore
        await db.collection('users').doc(userId).delete();

        // Step 3: Delete the user from Firebase Authentication
        await adminAuth.deleteUser(userId);

        revalidatePath('/'); // Revalidate all paths after deletion
        return { success: true, message: 'Sua conta e todos os seus dados foram excluídos permanentemente.' };

    } catch (error: any) {
        console.error(`CRITICAL: Failed to completely delete account for user ${userId}:`, error);
        return { success: false, message: error.message || 'Ocorreu um erro crítico ao tentar excluir sua conta.' };
    }
}

/**
 * Updates a user's profile from the admin panel.
 * @param userId The ID of the user to update.
 * @param data The data to update.
 * @returns An object indicating success or failure.
 */
export async function updateUserAsAdmin(userId: string, data: Partial<UserProfile>): Promise<{ success: boolean; message: string }> {
  if (!userId) {
    return { success: false, message: 'ID do usuário não fornecido.' };
  }

  try {
    const userRef = db.collection('users').doc(userId);
    const updateData = { ...data };

    // Convert Date object to Firestore Timestamp if present
    if (data.subscriptionExpiresAt && data.subscriptionExpiresAt instanceof Date) {
      updateData.subscriptionExpiresAt = Timestamp.fromDate(data.subscriptionExpiresAt);
    }
    
    await userRef.update(updateData);
    
    // If the role was changed, update custom claims
    if(data.role) {
        await adminAuth.setCustomUserClaims(userId, { role: data.role });
    }

    revalidatePath('/admin/users');
    revalidatePath(`/admin/users/${userId}`);

    return { success: true, message: 'Usuário atualizado com sucesso.' };
  } catch (error: any) {
    console.error(`Error updating user ${userId} from admin:`, error);
    return { success: false, message: error.message || 'Não foi possível atualizar o usuário.' };
  }
}
