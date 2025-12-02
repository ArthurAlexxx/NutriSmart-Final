
// src/app/careers/page.tsx
import Header from '@/components/header';
import Footer from '@/components/footer';
import { Mail, Sparkles, BrainCircuit, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Carreiras',
};

const benefits = [
    {
        icon: Sparkles,
        title: 'Impacto Real',
        description: 'Trabalhe em um produto que melhora a saúde e o bem-estar de milhares de pessoas todos os dias.',
    },
    {
        icon: BrainCircuit,
        title: 'Inovação Constante',
        description: 'Faça parte de uma equipe que está na fronteira da tecnologia de IA aplicada à nutrição e saúde.',
    },
    {
        icon: Users,
        title: 'Cultura Colaborativa',
        description: 'Acreditamos no poder da colaboração. Aqui, sua voz é ouvida e suas ideias fazem a diferença.',
    },
]

export default function CareersPage() {
    return (
        <div className="flex min-h-dvh flex-col bg-background font-sans">
            <Header />
            <main className="flex-1">
                {/* Hero Section */}
                <section className="relative bg-secondary/30 py-20 md:py-32">
                    <div className="container mx-auto text-center z-10 relative">
                        <h1 className="text-4xl md:text-6xl font-bold font-heading text-foreground">
                            Faça Parte da Nossa <span className="text-primary">Missão</span>
                        </h1>
                        <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
                            Estamos procurando pessoas apaixonadas e talentosas para nos ajudar a construir o futuro da nutrição e do bem-estar.
                        </p>
                    </div>
                </section>

                {/* Benefits Section */}
                <section className="py-20 lg:py-24">
                    <div className="container mx-auto">
                        <div className="text-center max-w-3xl mx-auto">
                            <h2 className="text-3xl font-bold md:text-4xl font-heading">Por que Trabalhar no Nutrinea?</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
                            {benefits.map((benefit) => (
                                <div key={benefit.title} className="text-center p-8 border rounded-2xl shadow-sm hover:shadow-primary/10 transition-shadow">
                                    <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-6">
                                        <benefit.icon className="h-8 w-8" />
                                    </div>
                                    <h3 className="text-xl font-bold font-heading">{benefit.title}</h3>
                                    <p className="text-muted-foreground mt-2">{benefit.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Open Positions Section */}
                <section className="bg-secondary/30 py-20 lg:py-24">
                    <div className="container mx-auto text-center">
                        <h2 className="text-3xl font-bold md:text-4xl font-heading">Vagas em Aberto</h2>
                        <div className="mt-12 max-w-2xl mx-auto">
                            <div className="p-8 border rounded-2xl bg-background text-center">
                                <p className="text-muted-foreground">
                                    No momento, não temos vagas abertas. No entanto, estamos sempre interessados em conhecer profissionais incríveis!
                                </p>
                                <p className="text-muted-foreground mt-2">
                                    Se você acredita que pode contribuir para nossa missão, envie seu currículo para nosso banco de talentos.
                                </p>
                                <Button asChild size="lg" className="mt-8">
                                    <a href="mailto:carreiras@nutrinea.com">
                                        <Mail className="mr-2 h-5 w-5" /> Enviar Currículo
                                    </a>
                                </Button>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
            <Footer />
        </div>
    );
}
