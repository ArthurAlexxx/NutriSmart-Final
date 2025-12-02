// src/app/layout.tsx
import type { Metadata } from 'next';
import { Poppins, Lexend } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import AppProvider from './app-provider';
import RootLayoutContent from './layout-content';

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

export const metadata: Metadata = {
  title: 'Nutrinea | Nutrição Inteligente, Vida Saudável',
  description: 'Sua plataforma de nutrição com Inteligência Artificial para planos alimentares, análise de refeições e acompanhamento de metas.',
  manifest: '/manifest.json',
  icons: {
    icon: '/icons/icon-512x512.png',
    apple: '/icons/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Nutrinea',
  },
  themeColor: '#72A159',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${poppins.variable} ${lexend.variable} !scroll-smooth h-full`}>
      <head>
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
                    console.log('ServiceWorker registration successful with scope: ', registration.scope);
                  }, err => {
                    console.log('ServiceWorker registration failed: ', err);
                  });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
