// src/app/layout.tsx
import type { Metadata, Viewport } from 'next';
import { Permanent_Marker } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import AppProvider from './app-provider';
import RootLayoutContent from './layout-content';
import { ThemeProvider } from '@/components/theme-provider';

const permanentMarker = Permanent_Marker({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-permanent-marker',
});


export const metadata: Metadata = {
  title: {
    default: 'Nutrinea',
    template: 'Nutrinea | %s',
  },
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
  other: {
    'mobile-web-app-capable': 'yes',
  }
};

export const viewport: Viewport = {
  themeColor: 'transparent',
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${permanentMarker.variable} !scroll-smooth h-full`} suppressHydrationWarning>
      <head />
      <body className='h-full'>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AppProvider>
              <RootLayoutContent>
                  {children}
              </RootLayoutContent>
          </AppProvider>
          <Toaster />
        </ThemeProvider>
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
