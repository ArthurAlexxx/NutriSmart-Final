// src/app/live-analysis/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import AppLayout from '@/components/app-layout';
import LiveAnalysisView from '@/components/live-analysis-view';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import SubscriptionOverlay from '@/components/subscription-overlay';

export default function LiveAnalysisPage() {
  const { user, userProfile, isUserLoading, onProfileUpdate, effectiveSubscriptionStatus } = useUser();
  const router = useRouter();

  const isFeatureLocked = effectiveSubscriptionStatus === 'free';

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading || !userProfile) {
    return (
      <AppLayout user={user} userProfile={userProfile} onProfileUpdate={onProfileUpdate}>
        <div className="flex h-full w-full items-center justify-center">
          <Loader2 className="h-16 w-16 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout user={user} userProfile={userProfile} onProfileUpdate={onProfileUpdate}>
       <div className="relative h-full w-full flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 bg-black">
        {isFeatureLocked && <SubscriptionOverlay />}
        <div className={cn("relative w-full h-full max-w-5xl mx-auto rounded-2xl overflow-hidden shadow-2xl", isFeatureLocked && 'blur-md pointer-events-none')}>
            <LiveAnalysisView />
        </div>
      </div>
    </AppLayout>
  );
}
