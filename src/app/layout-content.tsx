
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
      return; // Wait until the user session is verified
    }

    const publicRoutes = [
      '/', '/login', '/register', '/forgot-password', '/pricing',
      '/about', '/careers', '/press', '/terms', '/privacy',
    ];
    const authRoutes = ['/login', '/register', '/forgot-password'];
    
    // Check if the current route is considered public
    const isPublicRoute = publicRoutes.includes(pathname) || pathname.startsWith('/checkout');

    if (user) {
      // User is LOGGED IN
      
      // If PWA is on root, redirect to dashboard
      if (isPWA && pathname === '/') {
        const targetDashboard = effectiveSubscriptionStatus === 'professional' ? '/pro/patients' : '/dashboard';
        router.replace(targetDashboard);
        return;
      }

      // If user is on an auth page, redirect to dashboard
      if (authRoutes.includes(pathname)) {
        const targetDashboard = effectiveSubscriptionStatus === 'professional' ? '/pro/patients' : '/dashboard';
        router.replace(targetDashboard);
        return;
      }
    } else {
      // User is NOT LOGGED IN
      // If trying to access a protected route, redirect to login
      if (!isPublicRoute) {
        router.replace('/login');
        return;
      }
    }
  }, [user, isUserLoading, pathname, router, effectiveSubscriptionStatus, isPWA]);
  
  if (isUserLoading) {
    return <SplashScreen />;
  }

  return <>{children}</>;
}
