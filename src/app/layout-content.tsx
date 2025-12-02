
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
    
    // Define public routes that don't require authentication
    const isPublicRoute = [
      '/', '/login', '/register', '/forgot-password', '/pricing',
      '/about', '/careers', '/press', '/terms', '/privacy',
    ].some(route => pathname === route || (route !== '/' && pathname.startsWith(route + '/')));
    
    // Define routes that are part of the authenticated app experience
    const isProtectedRoute = [
        '/dashboard', '/analysis', '/plan', '/chef', '/history',
        '/live-analysis', '/pro', '/admin', '/profile'
    ].some(route => pathname.startsWith(route));

    // Routes related to authentication
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
    return <SplashScreen />;
  }

  return (
    <>
      {children}
    </>
  );
}
