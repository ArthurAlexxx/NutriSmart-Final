// src/app/app-provider.tsx
'use client';

import React from 'react';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { PWAProvider } from '@/context/pwa-context';

export default function AppProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    // This provider now wraps Firebase and PWA context providers.
    return (
        <FirebaseClientProvider>
            <PWAProvider>
                {children}
            </PWAProvider>
        </FirebaseClientProvider>
    );
}
