// src/app/layout-content.tsx
'use client'; 

import { useUser, usePWA } from '@/firebase';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import SplashScreen from '@/components/ui/splash-screen';

export default function RootLayoutContent({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const { isPWA } = usePWA();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // 1. Wait until authentication state is resolved
    if (isUserLoading) {
      return; 
    }

    const publicRoutes = ['/', '/pricing', '/about', '/careers', '/press', '/terms', '/privacy'];
    const authRoutes = ['/login', '/register', '/forgot-password'];
    
    const isPublicRoute = publicRoutes.includes(pathname);
    const isAuthRoute = authRoutes.includes(pathname);
    const isPublicArea = isPublicRoute || isAuthRoute || pathname.startsWith('/checkout');

    // 2. If running as a PWA, prevent access to public marketing pages
    if (isPWA && isPublicRoute) {
        router.replace('/dashboard');
        return;
    }

    // 3. Handle standard web routing logic
    if (user) {
      // User is LOGGED IN
      if (isAuthRoute) {
        // If user is logged in and tries to access login/register, redirect to dashboard
        router.replace('/dashboard');
      }
      // For any other route (including /profile), allow access (do nothing)
    } else {
      // User is NOT LOGGED IN
      if (!isPublicArea) {
        // If the route is not public, redirect to login
        router.replace('/login');
      }
      // For public routes, allow access (do nothing)
    }
  }, [user, isUserLoading, pathname, router, isPWA]);
  
  // Show splash screen during the initial auth check.
  // This prevents the "flicker" of the login page on initial load for authenticated users.
  if (isUserLoading) {
    return <SplashScreen />;
  }

  // Render the page content once auth state is resolved
  return <>{children}</>;
}
