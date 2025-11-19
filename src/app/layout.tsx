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
  title: 'NutriSmart',
  description: 'Acompanhe sua saúde e alimentação com a ajuda da inteligência artificial.',
  icons: {
    icon: [
      {
        url: `data:image/svg+xml,${encodeURIComponent(
          `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
            <rect width="100" height="100" rx="20" fill="hsl(101 28% 54%)" />
            <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-size="80" font-family="${lexend.style.fontFamily}" fill="white" dy=".05em">N</text>
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
