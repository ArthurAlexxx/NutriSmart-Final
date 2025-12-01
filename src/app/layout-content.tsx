'use client'; 

import { useUser } from '@/firebase';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import InstallPWAButton from '@/components/install-pwa-button';

export default function RootLayoutContent({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading, effectiveSubscriptionStatus } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isUserLoading) {
      return; // Aguarde o carregamento do estado do usuário
    }

    const publicRoutes = ['/login', '/register', '/forgot-password', '/pricing', '/about', '/careers', '/press', '/terms', '/privacy'];
    const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route)) || pathname === '/';
    const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/register') || pathname.startsWith('/forgot-password');

    if (user && isAuthRoute) {
      // Usuário logado tentando acessar uma página de autenticação
      const targetDashboard = effectiveSubscriptionStatus === 'professional' ? '/pro/patients' : '/dashboard';
      router.replace(targetDashboard);
    } else if (!user && !isPublicRoute) {
      // Usuário deslogado tentando acessar uma página protegida
      router.replace('/login');
    }

  }, [user, isUserLoading, pathname, router, effectiveSubscriptionStatus]);
  
  if (isUserLoading || !isClient) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
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
