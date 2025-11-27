// src/components/ui/pricing.tsx
"use client";

import { useState } from "react";
import { useUser } from "@/firebase";
import { Check, MoveRight, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import PaymentModal from "../payment-modal";
import { useToast } from "@/hooks/use-toast";

const plans = [
    {
        name: 'GRATUITO',
        priceId: null,
        price: '0',
        yearlyPrice: '0',
        period: 'Acesso para sempre',
        features: [
            'Registro de Refeições e Água',
            'Histórico de Consumo',
            'Definição de Metas Pessoais',
        ],
        description: 'O essencial para começar sua jornada de bem-estar, sem custo.',
        buttonText: 'Começar Agora',
        href: '/register',
        isPopular: false,
    },
    {
        name: 'PREMIUM',
        priceId: 'price_premium_monthly',
        yearlyPriceId: 'price_premium_yearly',
        price: '29.90', 
        yearlyPrice: '23.90',
        period: '/mês',
        features: [
            'Todas as funcionalidades do plano gratuito',
            'Análise de Desempenho com IA',
            'Plano Alimentar Inteligente e Adaptativo',
            'Chef Virtual com Receitas Ilimitadas',
            'Acompanhamento de Tendências de Peso',
        ],
        description: 'A experiência completa com todo o poder da IA para acelerar seus resultados.',
        buttonText: 'Adquirir Acesso',
        href: '/checkout?plan=premium',
        isPopular: true,
    },
    {
        name: 'PROFISSIONAL',
        priceId: 'price_pro_monthly',
        yearlyPriceId: 'price_pro_yearly',
        price: '49.90', 
        yearlyPrice: '39.90',
        period: '/mês',
        features: [
            'Todos os recursos do Premium para seu uso pessoal',
            'Dashboard de gestão de pacientes',
            'Biblioteca de planos e orientações',
            'Comunicação via chat integrado',
            'Módulo de controle financeiro',
        ],
        description: 'Uma solução completa para nutricionistas que desejam alta performance.',
        buttonText: 'Virar Profissional',
        href: '/register?type=pro',
        isPopular: false,
    },
];

function Pricing() {
  const [isYearly, setIsYearly] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<(typeof plans)[0] | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { user, userProfile, effectiveSubscriptionStatus } = useUser();
  const { toast } = useToast();

  const handleCtaClick = (plan: typeof plans[0]) => {
    if (!user || !userProfile) {
        // Not logged in, redirect to register/login
        window.location.href = plan.name === 'PROFISSIONAL' ? plan.href : '/register';
        return;
    }
    
    // User is logged in
    if (plan.name === 'GRATUITO') {
      window.location.href = '/dashboard';
      return;
    }

    const isCurrentPlan = effectiveSubscriptionStatus.toLowerCase() === plan.name.toLowerCase();

    if (isCurrentPlan) return;
    
    setSelectedPlan(plan);
    setIsModalOpen(true);
  };


  return (
    <>
    <div className="w-full py-20 lg:py-24">
      <div className="mx-auto px-4">
        <div className="flex text-center justify-center items-center gap-4 flex-col">
          <div className="flex flex-col items-center gap-4 text-center">
            <Badge variant="outline">Preços</Badge>
            <h2 className="text-3xl md:text-5xl tracking-tighter max-w-xl font-semibold">
              Um plano para cada etapa da sua jornada
            </h2>
            <p className="text-lg leading-relaxed tracking-tight text-muted-foreground max-w-xl">
              Escolha o plano que melhor se adapta às suas necessidades, seja você um usuário individual ou um profissional da saúde.
            </p>
          </div>
            <div className="flex items-center gap-4 mt-6">
                <span className={cn("font-medium", !isYearly ? "text-primary" : "text-muted-foreground")}>
                    Pagamento Mensal
                </span>
                <Switch
                    checked={isYearly}
                    onCheckedChange={setIsYearly}
                    aria-label="Alternar entre cobrança mensal e anual"
                />
                <span className={cn("font-medium", isYearly ? "text-primary" : "text-muted-foreground")}>
                    Pagamento Anual <Badge variant="default" className="ml-2">Economize 20%</Badge>
                </span>
            </div>
          
          <div className="grid grid-cols-1 items-stretch gap-8 md:grid-cols-3 mt-12">
            {plans.map((plan) => {
              
              const isCurrentPlan = effectiveSubscriptionStatus.toLowerCase() === plan.name.toLowerCase();
              const ctaText = user ? (isCurrentPlan ? 'Plano Atual' : plan.buttonText) : 'Começar Agora';
              const displayPrice = isYearly ? plan.yearlyPrice : plan.price;
              const displayPeriod = isYearly ? '/mês (cobrado anualmente)' : '/mês';

              return (
                <Card key={plan.name} className={cn("w-full rounded-2xl flex flex-col transition-all duration-300 hover:scale-105 hover:shadow-2xl", plan.isPopular && "shadow-2xl border-primary")}>
                    <CardHeader>
                        <CardTitle>
                        <span className="flex flex-row justify-between items-center font-normal">
                            {plan.name}
                            {plan.isPopular && <Badge variant="default">Mais Popular</Badge>}
                        </span>
                        </CardTitle>
                        <CardDescription>
                            {plan.description}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow">
                        <div className="flex flex-col gap-8 justify-start h-full">
                            <p className="flex flex-row items-baseline gap-2 text-xl">
                                {plan.name !== 'GRATUITO' && <span className="text-lg">R$</span>}
                                <span className="text-4xl font-bold">{displayPrice}</span>
                                {plan.name !== 'GRATUITO' && (
                                    <span className="text-sm text-muted-foreground">
                                       {displayPeriod}
                                    </span>
                                )}
                            </p>
                            <div className="flex flex-col gap-4 justify-start">
                                {plan.features.map((feature, index) => (
                                    <div key={index} className="flex flex-row gap-4">
                                        <Check className="w-4 h-4 mt-1 text-primary" />
                                        <p>{feature}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter>
                         <Button 
                            className="w-full gap-4" 
                            variant={plan.isPopular ? "default" : "outline"}
                            onClick={() => handleCtaClick(plan)}
                            disabled={isCurrentPlan}
                         >
                            <>
                             {ctaText} <MoveRight className="w-4 h-4" />
                            </>
                        </Button>
                    </CardFooter>
                </Card>
            )})}
          </div>
        </div>
      </div>
    </div>
    {user && userProfile && selectedPlan && (
        <PaymentModal 
            isOpen={isModalOpen}
            onOpenChange={setIsModalOpen}
            plan={selectedPlan}
            isYearly={isYearly}
            userProfile={userProfile}
        />
    )}
    </>
  );
}

export { Pricing };
