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

  useEffect(() => {
    if (isUserLoading) {
      return; 
    }

    const publicRoutes = ['/login', '/register', '/forgot-password', '/pricing', '/about', '/careers', '/press', '/terms', '/privacy'];
    const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route)) || pathname === '/';
    
    if (user) {
      // User is logged in.
      // If trying to access a public route that is ONLY for unauthenticated users, redirect.
      const authRoutes = ['/login', '/register', '/forgot-password'];
      if (authRoutes.includes(pathname)) {
        const targetDashboard = effectiveSubscriptionStatus === 'professional' ? '/pro/dashboard' : '/dashboard';
        router.replace(targetDashboard);
      }
    } else {
      // User is not logged in.
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
