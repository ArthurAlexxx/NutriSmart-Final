// src/app/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/header';
import Footer from '@/components/footer';
import { HeroSection } from '@/components/ui/hero-4';
import { FeaturesSection } from '@/components/ui/features-section';
import { TestimonialsSection } from '@/components/ui/testimonials-section';
import { CTASection } from '@/components/ui/cta-section';
import { Pricing } from '@/components/ui/pricing';
import { usePWA } from '@/context/pwa-context';
import PWAInstallModal from '@/components/pwa-install-modal';

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
  const { canInstall } = usePWA();
  const [isInstallModalOpen, setInstallModalOpen] = useState(false);

  useEffect(() => {
    // Abre o modal de instalação após 5 segundos se for instalável
    // e se o modal ainda não foi mostrado nesta sessão.
    if (canInstall && !sessionStorage.getItem('pwaInstallPrompted')) {
      const timer = setTimeout(() => {
        setInstallModalOpen(true);
        sessionStorage.setItem('pwaInstallPrompted', 'true');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [canInstall]);

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

        <section id="pricing" className="w-full py-20 lg:py-24 bg-background">
          <div className="container mx-auto">
            <Pricing />
          </div>
        </section>

        <CTASection />
        
      </main>
      <Footer />
      <PWAInstallModal isOpen={isInstallModalOpen} onOpenChange={setInstallModalOpen} />
    </div>
  );
}
