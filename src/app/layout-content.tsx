// src/app/layout-content.tsx
'use client'; 

import { useUser } from '@/firebase';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import SplashScreen from '@/components/ui/splash-screen';

export default function RootLayoutContent({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // 1. Wait until authentication state is resolved
    if (isUserLoading) {
      return; 
    }

    // 2. Define public routes that do not require authentication
    const publicRoutes = ['/', '/pricing', '/about', '/careers', '/press', '/terms', '/privacy'];
    const authRoutes = ['/login', '/register', '/forgot-password'];
    
    const isAuthRoute = authRoutes.includes(pathname);
    const isPublicRoute = publicRoutes.includes(pathname) || isAuthRoute || pathname.startsWith('/checkout');

    // 3. Handle routing logic
    if (user) {
      // User is LOGGED IN
      if (isAuthRoute) {
        // If user is logged in and tries to access login/register, redirect to dashboard
        router.replace('/dashboard');
      }
      // For any other route (including /profile), allow access (do nothing)
    } else {
      // User is NOT LOGGED IN
      if (!isPublicRoute) {
        // If the route is not public, redirect to login
        router.replace('/login');
      }
      // For public routes, allow access (do nothing)
    }
  }, [user, isUserLoading, pathname, router]);
  
  // Show splash screen during the initial auth check.
  // This prevents the "flicker" of the login page on initial load for authenticated users.
  if (isUserLoading) {
    return <SplashScreen />;
  }

  // Render the page content once auth state is resolved
  return <>{children}</>;
}
