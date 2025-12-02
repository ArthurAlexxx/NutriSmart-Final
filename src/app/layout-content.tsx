// src/app/layout-content.tsx
'use client'; 

import { useUser, usePWA } from '@/firebase';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import SplashScreen from '@/components/ui/splash-screen';

export default function RootLayoutContent({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isUserLoading) {
      return; // Wait until the user session is verified, show splash screen.
    }

    const authRoutes = ['/login', '/register', '/forgot-password'];
    const publicRoutes = [
      '/', '/pricing', '/about', '/careers', '/press', '/terms', '/privacy',
      ...authRoutes
    ];

    const isPublicRoute = publicRoutes.includes(pathname) || pathname.startsWith('/checkout');

    if (user) {
      // User is LOGGED IN.
      if (authRoutes.includes(pathname)) {
        // If user is on an auth page (e.g., /login), redirect to the dashboard.
        router.replace('/dashboard');
      }
      // For any other route, allow access.
    } else {
      // User is NOT LOGGED IN.
      if (!isPublicRoute) {
        // If trying to access a protected route, redirect to login.
        router.replace('/login');
      }
    }
  }, [user, isUserLoading, pathname, router]);
  
  if (isUserLoading) {
    return <SplashScreen />;
  }

  return <>{children}</>;
}
