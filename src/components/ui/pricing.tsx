// src/components/ui/pricing.tsx
"use client";

import { useState } from "react";
import { useUser } from "@/firebase";
import { Check, MoveRight, PhoneCall, Loader2 } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";


const plans = [
    {
        name: 'GRATUITO',
        priceId: null,
        price: '0',
        yearlyPrice: '0',
        period: 'para sempre',
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
        priceId: 'premium_placeholder',
        price: '19.90',
        yearlyPrice: '15.90', 
        period: 'por mês',
        features: [
            'Todas as funcionalidades do plano gratuito',
            'Análise de Desempenho com IA',
            'Plano Alimentar Inteligente e Adaptativo',
            'Chef Virtual com Receitas Ilimitadas',
            'Acompanhamento de Tendências de Peso',
        ],
        description: 'A experiência completa com todo o poder da IA para acelerar seus resultados.',
        buttonText: 'Fazer Upgrade',
        href: '/checkout?plan=premium',
        isPopular: true,
    },
    {
        name: 'CLÍNICO',
        priceId: null,
        price: '99.90',
        yearlyPrice: '79.90',
        period: 'por mês, por profissional',
        features: [
            'Plataforma White-Label para sua clínica',
            'Dashboard de gestão de pacientes',
            'Biblioteca de planos e orientações',
            'Acompanhamento em tempo real',
            'Comunicação via chat integrado',
        ],
        description: 'Uma solução completa para nutricionistas e clínicas que desejam alta performance.',
        buttonText: 'Virar Profissional',
        href: '/register?type=pro',
        isPopular: false,
    },
];

function Pricing() {
  const [isYearly, setIsYearly] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const { user, userProfile, onProfileUpdate } = useUser();
  const { toast } = useToast();
  const router = useRouter();

  const handleCtaClick = async (plan: typeof plans[0]) => {
    if (!user || !userProfile) {
        // Not logged in, redirect to register
        router.push(plan.href);
        return;
    }
    
    // User is logged in
    setLoadingPlan(plan.name);

    if (userProfile.subscriptionStatus === 'premium' && plan.name === 'PREMIUM') {
        toast({ title: "Você já é Premium!", description: "Sua assinatura já está ativa."});
        setLoadingPlan(null);
        return;
    }
    
    if (plan.name === 'GRATUITO') {
      router.push('/dashboard');
      return;
    }

    try {
        // Simulate payment & update subscription status
        const newStatus = plan.name === 'PREMIUM' ? 'premium' : 'professional';
        await onProfileUpdate({ subscriptionStatus: newStatus });
        
        toast({
            title: "Assinatura Ativada!",
            description: `Bem-vindo(a) ao plano ${plan.name}.`,
        });

        const destination = newStatus === 'professional' ? '/pro/patients' : '/dashboard';
        router.push(destination);

    } catch (error: any) {
        console.error("Subscription update failed:", error);
        toast({
            title: "Erro na Assinatura",
            description: "Não foi possível atualizar sua assinatura. Tente novamente.",
            variant: "destructive"
        });
    } finally {
        setLoadingPlan(null);
    }
  };


  return (
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
          
          <div className="flex justify-center items-center gap-4 py-8">
              <span className={cn("font-medium", !isYearly && "text-primary")}>Cobrança Mensal</span>
              <Switch checked={isYearly} onCheckedChange={setIsYearly} />
              <span className={cn("font-medium flex items-center", isYearly && "text-primary")}>
                Cobrança Anual
                <Badge variant="secondary" className="ml-2 hidden sm:block">Economize 20%</Badge>
              </span>
          </div>

          <div className="grid grid-cols-1 items-stretch gap-8 md:grid-cols-3">
            {plans.map((plan) => {
              
              const ctaText = user ? 
                (userProfile?.subscriptionStatus === 'premium' && plan.name === 'PREMIUM' ? 'Plano Atual' : plan.buttonText) : 
                'Começar Agora';

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
                                <span className="text-4xl font-bold">R${isYearly ? plan.yearlyPrice : plan.price}</span>
                                <span className="text-sm text-muted-foreground">
                                   / {plan.period}
                                </span>
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
                            disabled={loadingPlan === plan.name || (userProfile?.subscriptionStatus === 'premium' && plan.name === 'PREMIUM')}
                         >
                            {loadingPlan === plan.name ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" /> Carregando...
                                </>
                            ) : (
                                <>
                                 {ctaText} <MoveRight className="w-4 h-4" />
                                </>
                            )}
                        </Button>
                    </CardFooter>
                </Card>
            )})}
          </div>
        </div>
      </div>
    </div>
  );
}

export { Pricing };
