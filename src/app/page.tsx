// src/app/page.tsx
'use client';

import React from 'react';
import Header from '@/components/header';
import Footer from '@/components/footer';
import { HeroSection } from '@/components/ui/hero-4';
import { FeaturesSection } from '@/components/ui/features-section';
import { TestimonialsSection } from '@/components/ui/testimonials-section';
import { CTASection } from '@/components/ui/cta-section';
import { Pricing } from '@/components/ui/pricing';
import UseCasesSection from '@/components/ui/use-cases-section';
import MetricsSection from '@/components/ui/metrics-section';

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

  return (
    <div className="flex min-h-dvh flex-col bg-background font-sans overflow-x-hidden">
      <Header />
      <main className="flex-1">
        
        <HeroSection
            title={<>Transforme sua saúde com <br/></>}
            animatedTexts={[
            "nutrição inteligente.",
            "planos personalizados.",
            "análise de IA.",
            "receitas saudáveis.",
            ]}
            subtitle="A plataforma completa para você atingir seus objetivos de bem-estar com o poder da tecnologia e da inteligência artificial."
            infoBadgeText="✨ Bem-vindo ao futuro da nutrição!"
            ctaButtonText="Começar minha Jornada"
            ctaButtonLink="/register"
            socialProofText="Mais de 10.000 pessoas já se juntaram a nós"
            avatars={avatarData}
        />

        <FeaturesSection />
        
        <UseCasesSection />
        
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
