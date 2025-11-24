// src/app/actions/user-actions.ts
'use server';

import { db } from '@/lib/firebase/admin';
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
 * Deletes a user's account and all associated data permanently from Firestore.
 * This action MUST be called from a server context by an authenticated admin.
 * It uses the Firebase Admin SDK and requires the service account key to be configured.
 * @param userId The ID of the user to delete.
 * @returns An object indicating success or failure.
 */
export async function adminDeleteUserAction(userId: string): Promise<{ success: boolean; message: string }> {
    if (!userId) {
        return { success: false, message: 'ID do usuário não fornecido.' };
    }
    
    // IMPORTANT: The check to ensure the caller is an admin should be done in the API route/server context
    // before this action is ever called. This action assumes it's being run by a trusted admin process.

    try {
        // Step 1: Delete all subcollections recursively.
        // This uses the 'db' instance from '@lib/firebase/admin', which has admin privileges.
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
        
        // Step 2: Delete the main user document from Firestore.
        await db.collection('users').doc(userId).delete();

        // Step 3: (Optional, but recommended) Delete the user from Firebase Authentication.
        // This will throw the service account key error if not configured.
        // For now, we will focus on just deleting firestore data.
        // await auth.deleteUser(userId); 

        revalidatePath('/admin/users'); // Revalidate admin path after deletion
        return { success: true, message: 'Os dados do usuário foram excluídos permanentemente do Firestore.' };

    } catch (error: any) {
        console.error(`CRITICAL: Failed to completely delete account data for user ${userId}:`, error);
        return { success: false, message: error.message || 'Ocorreu um erro crítico ao tentar excluir os dados da conta.' };
    }
}
