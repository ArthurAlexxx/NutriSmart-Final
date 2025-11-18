// src/components/ui/use-cases-section.tsx
'use client';
import { Dumbbell, HeartPulse, Users } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const useCases = [
    {
        icon: HeartPulse,
        title: 'Para sua Saúde e Bem-Estar',
        description: 'Se você busca uma vida mais saudável, perder peso ou simplesmente entender melhor sua alimentação, o NutriSmart é seu parceiro ideal.',
    },
    {
        icon: Dumbbell,
        title: 'Para Atletas e Esportistas',
        description: 'Otimize sua performance controlando macronutrientes, calorias e hidratação com precisão para atingir seu máximo potencial.',
    },
    {
        icon: Users,
        title: 'Para Famílias',
        description: 'Planeje refeições saudáveis para todos em casa com o Chef IA e acompanhe os hábitos alimentares da sua família de forma integrada.',
    },
];

const UseCaseCard = ({ icon: Icon, title, description }: { icon: React.ElementType, title: string, description: string }) => (
    <Card className="shadow-sm hover:shadow-lg hover:border-primary/30 transition-all duration-300 rounded-2xl text-center">
        <CardHeader className="p-8">
            <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <Icon className="h-8 w-8" />
            </div>
            <CardTitle className="text-xl font-bold">{title}</CardTitle>
            <CardDescription className="mt-2">{description}</CardDescription>
        </CardHeader>
    </Card>
);

export default function UseCasesSection() {
    return (
        <section className="w-full py-20 lg:py-24">
            <div className="container mx-auto">
                <div className="text-center max-w-3xl mx-auto">
                    <h2 className="text-3xl font-bold md:text-4xl font-heading">Feito para você, seja qual for seu objetivo</h2>
                    <p className="mt-4 text-lg text-muted-foreground">
                        NutriSmart se adapta às suas necessidades, oferecendo as ferramentas certas para diferentes perfis e metas.
                    </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
                    {useCases.map((useCase) => (
                        <UseCaseCard key={useCase.title} {...useCase} />
                    ))}
                </div>
            </div>
        </section>
    );
}
