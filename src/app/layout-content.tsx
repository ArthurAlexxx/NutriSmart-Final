'use client'; 

import { useUser } from '@/firebase';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import InstallPWAButton from '@/components/install-pwa-button';

export default function RootLayoutContent({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading, effectiveSubscriptionStatus } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Se o estado de autenticação ainda está carregando, não fazemos nada.
    // O retorno de um componente de loading cuida da UI.
    if (isUserLoading) {
      return;
    }

    const isPublicRoute = [
      '/',
      '/login',
      '/register',
      '/forgot-password',
      '/pricing',
      '/about',
      '/careers',
      '/press',
      '/terms',
      '/privacy',
    ].some(route => pathname.startsWith(route));

    // Se o usuário ESTÁ LOGADO
    if (user) {
      const authRoutes = ['/login', '/register', '/forgot-password'];
      // E está tentando acessar uma página de autenticação
      if (authRoutes.includes(pathname)) {
        // Redireciona para o dashboard correto
        const targetDashboard = effectiveSubscriptionStatus === 'professional' ? '/pro/patients' : '/dashboard';
        router.replace(targetDashboard);
      }
    } 
    // Se o usuário NÃO ESTÁ LOGADO
    else {
      // E está tentando acessar uma rota protegida
      if (!isPublicRoute) {
        // Redireciona para o login
        router.replace('/login');
      }
    }
  // Dependências: A lógica deve rodar sempre que o status de loading, o usuário ou a rota mudarem.
  }, [user, isUserLoading, pathname, router, effectiveSubscriptionStatus]);
  
  // Exibe uma tela de loading em tela cheia enquanto o `useUser` hook está verificando o estado de autenticação.
  // Isso previne o "flash" de conteúdo ou redirecionamentos incorretos.
  if (isUserLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  // Uma vez que o carregamento está completo, renderiza os filhos (a página real).
  return (
    <>
      {children}
      <InstallPWAButton />
    </>
  );
}
