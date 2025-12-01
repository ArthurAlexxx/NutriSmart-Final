
// src/app/layout.tsx
'use client'; 

import type { Viewport } from 'next';
import { Poppins, Lexend } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import AppProvider from './app-provider';
import InstallPWAButton from '@/components/install-pwa-button';
import { useUser } from '@/firebase';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
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

const staticMetadata = {
  title: 'Nutrinea | Nutrição Inteligente, Vida Saudável',
  description: 'Sua plataforma de nutrição com Inteligência Artificial para planos alimentares, análise de refeições e acompanhamento de metas.',
};

export const viewport: Viewport = {
  themeColor: '#72A159',
};


function RootLayoutContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, userProfile, isUserLoading, isAdmin } = useUser();
  const [isPwa, setIsPwa] = useState(false);

  useEffect(() => {
    // This check only runs on the client side
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsPwa(true);
    }
  }, []);

  useEffect(() => {
    // Don't do anything while loading
    if (isUserLoading) return;

    const isAuthPage = pathname === '/login' || pathname === '/register' || pathname === '/forgot-password';

    if (user && userProfile) {
      // User is logged in
      if (isAuthPage) {
        // If on an auth page, redirect to the appropriate dashboard
        const destination = isAdmin ? '/admin' : (userProfile.profileType === 'professional' ? '/pro/patients' : '/dashboard');
        router.replace(destination);
      }
    } else {
      // User is not logged in
      const isPublicPage = ['/', '/about', '/careers', '/press', '/pricing', '/privacy', '/terms'].includes(pathname);
      if (!isAuthPage && !isPublicPage) {
        // If user is on a protected page and not logged in, redirect to login
        router.replace('/login');
      }
    }
    
    // PWA specific logic: if installed and not on an auth page, force to login/dashboard flow.
    if(isPwa && pathname === '/') {
        if(user) {
             const destination = isAdmin ? '/admin' : (userProfile?.profileType === 'professional' ? '/pro/patients' : '/dashboard');
             router.replace(destination);
        } else {
            router.replace('/login');
        }
    }

  }, [isUserLoading, user, userProfile, pathname, router, isAdmin, isPwa]);

  // Display a global loader ONLY while the initial user state is being verified
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
  return (
    <html lang="pt-BR" className={`${poppins.variable} ${lexend.variable} !scroll-smooth h-full`}>
      <head>
        <title>{staticMetadata.title}</title>
        <meta name="description" content={staticMetadata.description} />
        <link rel="icon" href="/icons/icon-192x192.png" sizes="192x192" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <link rel="manifest" href="/manifest.json?v=13" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className='h-full'>
        <AppProvider>
          <Suspense fallback={
            <div className="flex h-screen w-full items-center justify-center">
              <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
          }>
            <RootLayoutContent>
                {children}
            </RootLayoutContent>
          </Suspense>
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
