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
    if (isUserLoading || !isClient) {
      return; // Aguarde o carregamento do estado do usuário e a montagem do cliente
    }

    const publicRoutes = ['/login', '/register', '/forgot-password', '/pricing', '/about', '/careers', '/press', '/terms', '/privacy'];
    const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route)) || pathname === '/';
    const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/register') || pathname.startsWith('/forgot-password');

    if (user) {
      // Usuário está logado
      if (isAuthRoute) {
        // Se estiver em uma página de autenticação, redirecione para o dashboard apropriado
        const targetDashboard = effectiveSubscriptionStatus === 'professional' ? '/pro/dashboard' : '/dashboard';
        router.replace(targetDashboard);
      }
    } else {
      // Usuário não está logado
      if (!isPublicRoute) {
        // Se estiver tentando acessar uma página protegida, redirecione para o login
        router.replace('/login');
      }
    }

  }, [user, isUserLoading, pathname, router, effectiveSubscriptionStatus, isClient]);
  
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
