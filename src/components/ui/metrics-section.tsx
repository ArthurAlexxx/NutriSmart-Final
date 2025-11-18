// src/components/ui/metrics-section.tsx
'use client';
import { Award, Soup, Smile, TrendingUp } from 'lucide-react';
import CountUp from 'react-countup';

const metrics = [
    {
        icon: TrendingUp,
        value: 10,
        suffix: 'k+',
        label: 'Usuários Ativos',
    },
    {
        icon: Soup,
        value: 50,
        suffix: 'k+',
        label: 'Receitas Criadas com IA',
    },
    {
        icon: Award,
        value: 4.8,
        suffix: '/5',
        decimals: 1,
        label: 'Nota na App Store',
    },
    {
        icon: Smile,
        value: 98,
        suffix: '%',
        label: 'Satisfação dos Clientes',
    },
];

const MetricItem = ({ icon: Icon, value, suffix, decimals = 0, label }: typeof metrics[0]) => (
    <div className="text-center">
        <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
            <Icon className="h-8 w-8" />
        </div>
        <p className="text-4xl md:text-5xl font-bold text-primary">
            <CountUp end={value} duration={3} decimals={decimals} enableScrollSpy scrollSpyOnce />
            {suffix}
        </p>
        <p className="text-muted-foreground mt-1">{label}</p>
    </div>
);

export default function MetricsSection() {
    return (
        <section className="w-full py-20 lg:py-24 bg-secondary/30">
            <div className="container mx-auto">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                    {metrics.map((metric) => (
                        <MetricItem key={metric.label} {...metric} />
                    ))}
                </div>
            </div>
        </section>
    );
}
