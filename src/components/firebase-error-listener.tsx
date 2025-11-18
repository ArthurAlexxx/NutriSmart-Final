// src/components/firebase-error-listener.tsx
'use client';

import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export function FirebaseErrorListener() {
  const { toast } = useToast();

  useEffect(() => {
    const handlePermissionError = (error: FirestorePermissionError) => {
      console.error("Firestore Permission Error:", error.message, "\nContext:", error.request);
      
      if (process.env.NODE_ENV === 'development') {
        // In development, we can throw to show the Next.js error overlay
        // This gives a much richer debugging experience than a simple toast.
        throw error;
      } else {
        // In production, show a user-friendly toast
        toast({
          variant: 'destructive',
          title: 'Permissão Negada',
          description: 'Você não tem permissão para realizar esta ação.',
        });
      }
    };

    errorEmitter.on('permission-error', handlePermissionError);

    return () => {
      errorEmitter.off('permission-error', handlePermissionError);
    };
  }, [toast]);

  return null;
}
