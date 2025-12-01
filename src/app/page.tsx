// src/app/page.tsx
'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/header';
import Footer from '@/components/footer';
import { HeroSection } from '@/components/ui/hero-4';
import { FeaturesSection } from '@/components/ui/features-section';
import { TestimonialsSection } from '@/components/ui/testimonials-section';
import { CTASection } from '@/components/ui/cta-section';
import { Pricing } from '@/components/ui/pricing';
import MetricsSection from '@/components/ui/metrics-section';
import { useUser } from '@/firebase';
import { Loader2 } from 'lucide-react';

const avatarData = [
  {
    src: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100",
    alt: "Usuária Juliana",
    fallback: "JU",
  },
  {
    src: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=100",
    alt: "Usuário Carlos",
    fallback: "CA",
  },
  {
    src: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=100",
    alt: "Nutricionista Fernanda",
    fallback: "FE",
  },
];

export default function Home() {
  const router = useRouter();
  const { user, isUserLoading, effectiveSubscriptionStatus } = useUser();
  const [isPwa, setIsPwa] = React.useState(false);
  const [isCheckingPwa, setIsCheckingPwa] = React.useState(true);

  useEffect(() => {
    // This check only runs on the client side
    const isPwaMode = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    setIsPwa(isPwaMode);
    setIsCheckingPwa(false);

    if (isPwaMode) {
      if (!isUserLoading) {
        if (user) {
          const destination = effectiveSubscriptionStatus === 'professional' ? '/pro/dashboard' : '/dashboard';
          router.replace(destination);
        } else {
          router.replace('/login');
        }
      }
    }
  }, [isUserLoading, user, effectiveSubscriptionStatus, router]);
  
  if (isCheckingPwa || isPwa) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background font-sans overflow-x-hidden">
      <Header />
      <main className="flex-1">
        
        <HeroSection
            title={<>seu <span className='text-primary'>plano perfeito</span> para</>}
            animatedTexts={[
            "evoluir.",
            "conquistar.",
            "simplificar.",
            ]}
            subtitle="Atingir seus objetivos de saúde nunca foi tão simples. Deixe nossa Inteligência Artificial cuidar dos detalhes para você."
            infoBadgeText="✨ Bem-vindo ao futuro da nutrição!"
            ctaButtonText="Começar minha Jornada"
            ctaButtonLink="/register"
            socialProofText="Mais de 10.000 pessoas já confiam em nós"
            avatars={avatarData}
        />

        <FeaturesSection />
                
        <TestimonialsSection />

        <MetricsSection />

        <section id="pricing" className="w-full py-20 lg:py-24 bg-background">
          <div className="container mx-auto">
            <Pricing />
          </div>
        </section>

        <CTASection />
        
      </main>
      <Footer />
    </div>
  );
}
