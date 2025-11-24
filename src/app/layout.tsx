// src/app/layout.tsx
import type { Metadata, Viewport } from 'next';
import { Poppins, Lexend, Playfair_Display, Roboto_Slab, Montserrat, Lato, Merriweather, Oswald, Lobster, Pacifico, Dancing_Script, Caveat } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import AppProvider from './app-provider';

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
  description: 'Sua plataforma de nutrição com Inteligência Artificial para planos alimentares, análise de refeições e acompanhamento de metas. Transforme sua saúde com Nutrinea.',
  icons: {
    icon: [
      {
        url: `data:image/svg+xml,${encodeURIComponent(
          `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="50" fill="hsl(101 28% 54%)" />
            <path d="M36 75V25H47.1L64 53.3V25H73V75H61.9L45 46.7V75H36Z" fill="white"/>
          </svg>`
        )}`,
        type: 'image/svg+xml',
      },
    ],
  }
};

export const viewport: Viewport = {
  themeColor: '#72A159',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${poppins.variable} ${lexend.variable} !scroll-smooth`}>
      <body>
        <AppProvider>
          {children}
        </AppProvider>
        <Toaster />
      </body>
    </html>
  );
}
