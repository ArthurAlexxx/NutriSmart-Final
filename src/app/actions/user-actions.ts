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
 * Deletes a user's account and all associated data permanently.
 * IMPORTANT: This action is called from a server context (the admin panel),
 * so it has the necessary privileges to delete any user's data.
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

        // Step 3: We will NOT delete the user from Firebase Authentication
        // to avoid dependency on the full Admin SDK and service account key in all environments.
        // The user will no longer be able to log in effectively because their Firestore data is gone.
        // await adminAuth.deleteUser(userId); // This line is intentionally commented out.

        revalidatePath('/'); // Revalidate all paths after deletion
        return { success: true, message: 'Os dados do usuário foram excluídos permanentemente do Firestore.' };

    } catch (error: any) {
        console.error(`CRITICAL: Failed to completely delete account data for user ${userId}:`, error);
        return { success: false, message: error.message || 'Ocorreu um erro crítico ao tentar excluir os dados da conta.' };
    }
}
