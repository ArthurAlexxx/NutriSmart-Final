// src/components/ui/metrics-section.tsx
'use client';
import { Award, Soup, Smile, TrendingUp } from 'lucide-react';
import React from 'react';

const metrics = [
    {
        icon: TrendingUp,
        value: '10k+',
        label: 'Usuários Ativos',
    },
    {
        icon: Soup,
        value: '50k+',
        label: 'Receitas Criadas com IA',
    },
    {
        icon: Award,
        value: '4.8/5',
        label: 'Nota na App Store',
    },
    {
        icon: Smile,
        value: '98%',
        label: 'Satisfação dos Clientes',
    },
];

const MetricItem = ({ icon: Icon, value, label }: { icon: React.ElementType, value: string, label: string }) => (
    <div className="text-center">
        <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
            <Icon className="h-8 w-8" />
        </div>
        <p className="text-4xl md:text-5xl font-bold text-primary">
            {value}
        </p>
        <p className="text-muted-foreground mt-1">{label}</p>
    </div>
);

export default function MetricsSection() {
    return (
        <section className="w-full py-20 lg:py-24 bg-secondary/30">
            <div className="container mx-auto">
                 <div className="text-center max-w-3xl mx-auto mb-16">
                     <div className="mb-4 inline-block border border-primary text-primary px-3 py-1 rounded-full text-sm font-semibold">Resultados</div>
                    <h2 className="text-3xl font-bold md:text-4xl font-heading">Nossos números falam por nós</h2>
                    <p className="mt-4 text-lg text-muted-foreground">
                        Estamos orgulhosos do impacto que geramos na vida de nossos usuários e da confiança que construímos.
                    </p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                    {metrics.map((metric) => (
                        <MetricItem key={metric.label} {...metric} />
                    ))}
                </div>
            </div>
        </section>
    );
}
