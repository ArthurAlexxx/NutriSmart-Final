
'use client'; 

import { useUser, usePWA } from '@/firebase';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import SplashScreen from '@/components/ui/splash-screen';

export default function RootLayoutContent({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading, effectiveSubscriptionStatus } = useUser();
  const { isPWA } = usePWA();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isUserLoading) {
      return; // Do nothing while loading, the splash screen will be shown
    }

    const publicRoutes = [
      '/', '/login', '/register', '/forgot-password', '/pricing',
      '/about', '/careers', '/press', '/terms', '/privacy',
    ];
    // This now includes the base /checkout page. Dynamic checkout routes are implicitly allowed.
    const isPublicRoute = publicRoutes.includes(pathname) || pathname.startsWith('/checkout');

    const authRoutes = ['/login', '/register', '/forgot-password'];
    
    // PWA-specific logic: if it's a PWA and on the root, redirect immediately.
    if (isPWA && pathname === '/') {
        if (user) {
            const targetDashboard = effectiveSubscriptionStatus === 'professional' ? '/pro/patients' : '/dashboard';
            router.replace(targetDashboard);
        } else {
            router.replace('/login');
        }
        return; // Stop further execution for this specific PWA case
    }

    if (user) {
      // User is logged in
      // If they are on an auth page, redirect them to their dashboard
      if (authRoutes.includes(pathname)) {
        const targetDashboard = effectiveSubscriptionStatus === 'professional' ? '/pro/patients' : '/dashboard';
        router.replace(targetDashboard);
      }
    } else {
      // User is not logged in
      // If they are trying to access a non-public route, redirect to login
      if (!isPublicRoute) {
        router.replace('/login');
      }
    }
  }, [user, isUserLoading, pathname, router, effectiveSubscriptionStatus, isPWA]);
  
  if (isUserLoading) {
    return <SplashScreen />;
  }

  return (
    <>
      {children}
    </>
  );
}
