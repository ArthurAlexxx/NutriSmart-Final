// src/components/summary-cards.tsx
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Target, Rocket, Flame, Donut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FaHamburger } from 'react-icons/fa';
import { useMediaQuery } from '@/hooks/use-media-query';
import { CircularProgress } from './ui/circular-progress';

interface SummaryCardsProps {
  totalNutrients: {
    calorias: number;
    proteinas: number;
    carboidratos?: number;
    gorduras?: number;
  };
   nutrientGoals?: {
    calories: number;
    protein: number;
    carbs?: number;
    fat?: number;
  };
  isAnalysisPage?: boolean;
}

const SummaryCard = ({ title, value, unit, icon: Icon, color, goal }: { title: string, value: string, unit: string, icon: React.ElementType, color: string, goal?: number | null }) => {
    return (
        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-2xl bg-card flex flex-col h-full">
            <CardContent className="p-4 flex flex-col justify-between flex-grow">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className={cn("p-2 rounded-lg", color)}>
                            <Icon className="h-5 w-5 text-white" />
                        </div>
                        <p className="text-sm font-semibold text-muted-foreground">{title}</p>
                    </div>
                </div>
                <div>
                     <div className="flex items-baseline gap-1 mt-3">
                        <p className="text-3xl font-bold">{value}</p>
                        <p className="text-base text-muted-foreground">{unit}</p>
                    </div>
                    <div className='h-4 mt-1'>
                        {goal != null && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1"><Target className="h-3 w-3"/> Meta: {goal.toLocaleString('pt-BR')} {unit}</p>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

const MobileSummaryCard = ({ summaryCardsData, totalNutrients, nutrientGoals }: { summaryCardsData: any[], totalNutrients: SummaryCardsProps['totalNutrients'], nutrientGoals?: SummaryCardsProps['nutrientGoals'] }) => (
    <Card className="shadow-lg rounded-2xl animate-fade-in">
        <CardHeader>
            <CardTitle>Resumo do Dia</CardTitle>
        </CardHeader>
        <CardContent>
             <div className="grid grid-cols-2 gap-4">
                {summaryCardsData.map((card, index) => {
                    const goal = card.title === 'Calorias' ? nutrientGoals?.calories : 
                                 card.title === 'Proteínas' ? nutrientGoals?.protein :
                                 card.title === 'Carboidratos' ? nutrientGoals?.carbs :
                                 card.title === 'Gorduras' ? nutrientGoals?.fat : null;
                    
                    const value = card.title === 'Calorias' ? totalNutrients.calorias : 
                                  card.title === 'Proteínas' ? totalNutrients.proteinas : 
                                  card.title === 'Carboidratos' ? totalNutrients.carboidratos : 
                                  totalNutrients.gorduras;

                    const progressValue = (goal && value && goal > 0) ? Math.min((value / goal) * 100, 100) : 0;
                    
                    return (
                        <div key={card.title} className="space-y-3 p-3 rounded-xl bg-background/50 border">
                             <div className="flex items-center gap-2 text-sm font-medium">
                                <div className={cn("p-1.5 rounded-md", card.color)}>
                                    <card.icon className="h-4 w-4 text-white" />
                                </div>
                                <span className="text-muted-foreground">{card.title}</span>
                            </div>
                            
                            <div className="relative flex items-center justify-center h-20">
                                <CircularProgress value={progressValue} colorClass={card.color} />
                                <div className='absolute flex flex-col items-center justify-center'>
                                     <span className='text-xl font-bold text-foreground'>{card.value}</span>
                                     <span className='text-xs text-muted-foreground -mt-1'>{card.unit}</span>
                                </div>
                            </div>
                            {goal != null && (
                                <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
                                    <Target className="h-3 w-3"/> Meta: {goal.toLocaleString('pt-BR')} {card.unit}
                                </p>
                            )}
                        </div>
                    );
                })}
            </div>
        </CardContent>
    </Card>
)


export default function SummaryCards({ totalNutrients, nutrientGoals, isAnalysisPage = false }: SummaryCardsProps) {
  const titlePrefix = isAnalysisPage ? 'Média ' : '';
  const isMobile = useMediaQuery('(max-width: 767px)');

  const summaryCardsData = [
    {
      title: 'Calorias',
      value: `${Math.round(totalNutrients.calorias).toLocaleString('pt-BR')}`,
      unit: 'kcal',
      icon: Flame,
      color: 'bg-orange-400',
      goal: nutrientGoals?.calories,
    },
    {
      title: 'Proteínas',
      value: `${(totalNutrients.proteinas || 0).toFixed(0)}`,
      unit: 'g',
      icon: Rocket,
      color: 'bg-blue-400',
      goal: nutrientGoals?.protein,
    },
    {
      title: 'Carboidratos',
      value: `${(totalNutrients.carboidratos || 0).toFixed(0)}`,
      unit: 'g',
      icon: FaHamburger,
      color: 'bg-yellow-400',
      goal: nutrientGoals?.carbs,
    },
    {
      title: 'Gorduras',
      value: `${(totalNutrients.gorduras || 0).toFixed(0)}`,
      unit: 'g',
      icon: Donut,
      color: 'bg-pink-400',
      goal: nutrientGoals?.fat,
    }
  ];

  if (isMobile && !isAnalysisPage) {
      return <MobileSummaryCard summaryCardsData={summaryCardsData} totalNutrients={totalNutrients} nutrientGoals={nutrientGoals}/>;
  }

  const desktopData = summaryCardsData.map(d => ({ ...d, title: `${titlePrefix}${d.title}`}));

  return (
    <div className="grid grid-cols-2 gap-4">
      {desktopData.map((card, index) => (
        <div key={card.title} className="animate-fade-in" style={{animationDelay: `${index * 100}ms`}}>
            <SummaryCard {...card} />
        </div>
      ))}
    </div>
  );
}
