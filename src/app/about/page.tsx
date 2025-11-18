
// src/app/about/page.tsx
import Header from '@/components/header';
import Footer from '@/components/footer';
import { ArrowRight, Leaf, Target, Users } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

const values = [
    {
        icon: Leaf,
        title: 'Saúde Acessível',
        description: 'Acreditamos que todos merecem acesso a uma vida mais saudável. Nossa tecnologia simplifica a nutrição, tornando-a compreensível e alcançável para todos.',
    },
    {
        icon: Target,
        title: 'Inovação Contínua',
        description: 'Estamos na vanguarda da tecnologia de IA para oferecer as ferramentas mais inteligentes e personalizadas, sempre evoluindo para atender às suas necessidades.',
    },
    {
        icon: Users,
        title: 'Foco no Usuário',
        description: 'Nossos usuários estão no centro de tudo o que fazemos. Construímos uma plataforma intuitiva, confiável e que realmente faz a diferença no dia a dia.',
    },
]

export default function AboutPage() {
    return (
        <div className="flex min-h-dvh flex-col bg-background font-sans">
            <Header />
            <main className="flex-1">
                {/* Hero Section */}
                <section className="relative bg-secondary/30 py-20 md:py-32">
                    <div className="container mx-auto text-center z-10 relative">
                        <h1 className="text-4xl md:text-6xl font-bold font-heading text-foreground">
                            Nossa Missão é <span className="text-primary">Democratizar a Saúde</span>
                        </h1>
                        <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
                            No NutriSmart, estamos redefinindo o bem-estar, unindo nutrição de ponta com o poder da inteligência artificial para criar um caminho mais simples e inteligente para uma vida saudável.
                        </p>
                    </div>
                </section>

                {/* Values Section */}
                <section className="py-20 lg:py-24">
                    <div className="container mx-auto">
                        <div className="text-center max-w-3xl mx-auto">
                            <h2 className="text-3xl font-bold md:text-4xl font-heading">Nossos Valores</h2>
                            <p className="mt-4 text-lg text-muted-foreground">
                                Os pilares que guiam cada funcionalidade que desenvolvemos.
                            </p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
                            {values.map((value) => (
                                <div key={value.title} className="text-center p-8 border rounded-2xl shadow-sm hover:shadow-primary/10 transition-shadow">
                                    <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-6">
                                        <value.icon className="h-8 w-8" />
                                    </div>
                                    <h3 className="text-xl font-bold font-heading">{value.title}</h3>
                                    <p className="text-muted-foreground mt-2">{value.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* CTA Section */}
                <section className="bg-secondary/30">
                    <div className="container mx-auto py-20 lg:py-24 text-center">
                        <h2 className="text-3xl font-bold md:text-4xl font-heading">Junte-se à Revolução do Bem-Estar</h2>
                        <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
                            Comece hoje a transformar sua saúde com a ajuda da nossa tecnologia.
                        </p>
                        <Button asChild size="lg" className="mt-8">
                            <Link href="/register">
                                Começar minha Jornada
                                <ArrowRight className="ml-2 h-5 w-5" />
                            </Link>
                        </Button>
                    </div>
                </section>
            </main>
            <Footer />
        </div>
    );
}
