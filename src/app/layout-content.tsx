
'use client'; 

import { useUser, usePWA } from '@/firebase';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function RootLayoutContent({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading, effectiveSubscriptionStatus } = useUser();
  const { isPWA } = usePWA();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isUserLoading) {
      return; // Do nothing while loading
    }

    // PWA-specific routing: bypass landing page
    if (isPWA && pathname === '/') {
        if (user) {
            const targetDashboard = effectiveSubscriptionStatus === 'professional' ? '/pro/patients' : '/dashboard';
            router.replace(targetDashboard);
        } else {
            router.replace('/login');
        }
        return; // Stop further execution for this case
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
  }, [user, isUserLoading, pathname, router, effectiveSubscriptionStatus, isPWA]);
  
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
    </>
  );
}
