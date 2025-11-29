// src/app/layout.tsx
'use client';
import type { Metadata, Viewport } from 'next';
import { Poppins, Lexend, Playfair_Display, Roboto_Slab, Montserrat, Lato, Merriweather, Oswald, Lobster, Pacifico, Dancing_Script, Caveat } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import AppProvider from './app-provider';
import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

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

// A metadata estática continua importante para SEO e para o primeiro carregamento
const metadata: Metadata = {
  title: 'Nutrinea | Nutrição Inteligente, Vida Saudável',
  description: 'Sua plataforma de nutrição com Inteligência Artificial para planos alimentares, análise de refeições e acompanhamento de metas.',
  icons: {
    icon: '/icons/icon-192x192.png',
    apple: '/icons/icon-192x192.png',
  },
  manifest: '/manifest.json?v=3',
};

const viewport: Viewport = {
  themeColor: '#4A6B3A',
};

function RootLayoutContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const [isPwa, setIsPwa] = useState(false);

  useEffect(() => {
    // Esta verificação só roda no lado do cliente
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsPwa(true);
    }
  }, []);

  useEffect(() => {
    // Se for um PWA, e o carregamento do usuário terminou, e não há usuário
    if (isPwa && !isUserLoading && !user) {
      // Redireciona para o login. Isso garante que a primeira abertura vá para o login.
      router.replace('/login');
    }
  }, [isPwa, isUserLoading, user, router]);

  return (
    <>
      {children}
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
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className='h-full'>
        <AppProvider>
          <RootLayoutContent>
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
