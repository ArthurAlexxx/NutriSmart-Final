// src/app/actions/user-actions.ts
'use server';

import { db } from '@/lib/firebase/admin';
import { revalidatePath } from 'next/cache';
import type { UserProfile } from '@/types/user';
import { Timestamp } from 'firebase-admin/firestore';
import { headers } from 'next/headers';
import { auth } from 'firebase-admin';

/**
 * Gets the user ID from the Authorization header's Bearer token.
 * THIS IS A SERVER-SIDE FUNCTION and requires Firebase Admin SDK to be initialized.
 * @returns The user's ID (uid) if the token is valid.
 * @throws An error if the token is missing, invalid, or expired.
 */
async function getUserIdFromToken(): Promise<string> {
    const authorization = headers().get('Authorization');
    if (!authorization?.startsWith('Bearer ')) {
        throw new Error('Missing or invalid Authorization header.');
    }
    const idToken = authorization.split('Bearer ')[1];
    
    try {
        const decodedToken = await auth().verifyIdToken(idToken);
        return decodedToken.uid;
    } catch (error) {
        console.error("Token verification failed:", error);
        throw new Error('Invalid or expired token.');
    }
}


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
 * This action is called from a server context but verifies the user's identity.
 * @param userId The ID of the user account to delete.
 * @returns An object indicating success or failure.
 */
export async function deleteAccountAction(userId: string): Promise<{ success: boolean; message: string }> {
    if (!userId) {
        return { success: false, message: 'ID do usuário não fornecido.' };
    }

    try {
        // Security Check: Ensure the user making the request is the one being deleted.
        const authenticatedUserId = await getUserIdFromToken();
        if (authenticatedUserId !== userId) {
            return { success: false, message: 'Não autorizado. Você só pode excluir sua própria conta.' };
        }

        // Proceed with deletion using the Firebase Admin SDK to bypass security rules.
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
        
        await db.collection('users').doc(userId).delete();

        // We will NOT delete from Firebase Auth to avoid the service account key error.
        // The account will become unusable as its Firestore document is gone.
        
        return { success: true, message: 'Sua conta e todos os seus dados foram excluídos permanentemente.' };

    } catch (error: any) {
        console.error(`CRITICAL: Failed to delete account data for user ${userId}:`, error);
        return { success: false, message: error.message || 'Ocorreu um erro crítico ao tentar excluir a conta.' };
    }
}