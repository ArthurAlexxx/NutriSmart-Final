
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
    if (isUserLoading) {
      return; // Do nothing while loading
    }

    const isPublicRoute = [
      '/', '/login', '/register', '/forgot-password', '/pricing',
      '/about', '/careers', '/press', '/terms', '/privacy',
    ].some(route => pathname.startsWith(route));

    const authRoutes = ['/login', '/register', '/forgot-password'];

    if (user) {
      // User is logged in
      if (authRoutes.includes(pathname)) {
        const targetDashboard = effectiveSubscriptionStatus === 'professional' ? '/pro/patients' : '/dashboard';
        router.replace(targetDashboard);
      }
    } else {
      // User is not logged in
      if (!isPublicRoute) {
        router.replace('/login');
      }
    }
  }, [user, isUserLoading, pathname, router, effectiveSubscriptionStatus]);
  
  if (isUserLoading) {
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
