
// src/app/app-provider.tsx
'use client';

import React from 'react';
import { FirebaseClientProvider } from '@/firebase/client-provider';

export default function AppProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    // This provider now only wraps the Firebase provider, as multi-tenant
    // theme and config loading has been removed.
    return (
        <FirebaseClientProvider>
            {children}
        </FirebaseClientProvider>
    );
}
