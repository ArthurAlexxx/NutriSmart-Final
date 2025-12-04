// src/components/ui/cta-section.tsx
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Card, CardContent } from './card';

export function CTASection() {
    return (
        <section className="w-full py-20 lg:py-24">
            <div className="container mx-auto">
                <Card className="bg-primary text-primary-foreground overflow-hidden shadow-2xl shadow-primary/20">
                    <CardContent className="p-10 md:p-16 flex flex-col md:flex-row items-center justify-between gap-8 text-center md:text-left">
                        <div className="flex-1">
                            <h2 className="text-3xl font-bold md:text-4xl font-heading">
                                Sua melhor versão está esperando.
                            </h2>
                            <p className="mt-4 text-lg text-primary-foreground max-w-xl">
                                Dê o primeiro passo hoje e descubra como a tecnologia pode simplificar sua jornada para uma vida mais saudável e feliz.
                            </p>
                        </div>
                        <div className="shrink-0">
                             <Button asChild size="lg" variant="secondary" className="h-14 text-base px-8">
                                <Link href="/register">
                                    Começar Jornada Grátis <ArrowRight className="ml-2 h-5 w-5" />
                                </Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </section>
    );
}
