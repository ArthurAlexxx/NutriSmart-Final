
// src/app/layout.tsx
'use client'; // This directive is necessary for the hooks below

import type { Metadata, Viewport } from 'next';
import { Poppins, Lexend } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import AppProvider from './app-provider';
import InstallPWAButton from '@/components/install-pwa-button';
import { useUser } from '@/firebase';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700', '800'],
  variable: '--font-poppins',
});

const lexend = Lexend({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-lexend',
});

export const viewport: Viewport = {
  themeColor: '#72A159',
};


function RootLayoutContent({ children, pathname }: { children: React.ReactNode, pathname: string | null }) {
  const router = useRouter();
  const { user, userProfile, isUserLoading, isAdmin } = useUser();
  const [isPwa, setIsPwa] = useState(false);

  useEffect(() => {
    // This check only runs on the client side
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsPwa(true);
    }
  }, []);

  useEffect(() => {
    if (isUserLoading || !pathname) return; // Don't do anything while loading or if path is not ready

    if (isPwa && !user) {
        // If it is a PWA and there is no user, force login
        if (pathname !== '/login') {
            router.replace('/login');
        }
    } else if (user && userProfile && (pathname === '/login' || pathname === '/register')) {
        // If user is logged in and on an auth page, redirect to the app
        const destination = isAdmin ? '/admin' : (userProfile.profileType === 'professional' ? '/pro/patients' : '/dashboard');
        router.replace(destination);
    }
  }, [isPwa, isUserLoading, user, userProfile, isAdmin, router, pathname]);

  // Display the main loader ONLY while the initial user state is being verified
  if (isUserLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      {children}
      <InstallPWAButton />
    </>
  );
}


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname(); 

  return (
    <html lang="pt-BR" className={`${poppins.variable} ${lexend.variable} !scroll-smooth h-full`}>
      <head>
        {/* Metadata placed here */}
        <title>Nutrinea | Nutrição Inteligente, Vida Saudável</title>
        <meta name="description" content="Sua plataforma de nutrição com Inteligência Artificial para planos alimentares, análise de refeições e acompanhamento de metas." />
        <link rel="icon" href="/icons/icon-192x192.png" sizes="192x192" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <link rel="manifest" href="/manifest.json?v=2" />

        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className='h-full'>
        <AppProvider>
            <RootLayoutContent pathname={pathname}>
                {children}
            </RootLayoutContent>
        </AppProvider>
        <Toaster />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js').then(registration => {
                    console.log('SW registered: ', registration);
                  }).catch(err => console.log('SW registration failed: ', err));
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
