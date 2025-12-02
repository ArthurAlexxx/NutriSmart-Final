// src/app/live-analysis/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import AppLayout from '@/components/app-layout';
import LiveAnalysisView from '@/components/live-analysis-view';
import { Loader2, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import SubscriptionOverlay from '@/components/subscription-overlay';
import { useMediaQuery } from '@/hooks/use-media-query';
import { Card, CardContent } from '@/components/ui/card';

function DesktopWarning() {
    return (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/90 backdrop-blur-sm">
            <Card className="max-w-md text-center">
                <CardContent className="p-8">
                    <Smartphone className="mx-auto h-16 w-16 text-primary mb-4" />
                    <h2 className="text-2xl font-bold">Recurso Otimizado para Celular</h2>
                    <p className="text-muted-foreground mt-2">
                        A análise de vídeo ao vivo foi projetada para a melhor experiência na câmera do seu celular. Você pode continuar, mas a funcionalidade pode ser limitada no desktop.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}


export default function LiveAnalysisPage() {
  const { user, userProfile, onProfileUpdate, effectiveSubscriptionStatus } = useUser();
  const router = useRouter();
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  const isFeatureLocked = effectiveSubscriptionStatus === 'free';
  
  return (
    <AppLayout user={user} userProfile={userProfile} onProfileUpdate={onProfileUpdate}>
       <div className="relative h-full w-full flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 bg-black">
        {isDesktop && <DesktopWarning />}
        {isFeatureLocked && <SubscriptionOverlay />}
        <div className={cn("relative w-full h-full max-w-5xl mx-auto rounded-2xl overflow-hidden shadow-2xl pb-16 sm:pb-0", isFeatureLocked && 'blur-md pointer-events-none')}>
            <LiveAnalysisView />
        </div>
      </div>
    </AppLayout>
  );
}
