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
    
    const numericValue = parseFloat(value.replace('.', ''));
    const progressValue = (goal && numericValue && goal > 0) ? Math.min((numericValue / goal) * 100, 100) : 0;

    return (
        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-2xl bg-card flex flex-col h-full">
            <CardContent className="p-4 flex flex-col justify-center items-center flex-grow text-center">
                <div className="flex items-center gap-2 mb-3">
                    <div className={cn("p-1.5 rounded-md", color)}>
                        <Icon className="h-4 w-4 text-white" />
                    </div>
                    <p className="text-sm font-semibold text-muted-foreground">{title}</p>
                </div>
                
                <div className="relative flex items-center justify-center h-28 w-28">
                    <CircularProgress value={progressValue} colorClass={color} />
                    <div className='absolute flex flex-col items-center justify-center'>
                         <span className='text-2xl font-bold text-foreground'>{value}</span>
                         <span className='text-xs text-muted-foreground -mt-1'>{unit}</span>
                    </div>
                </div>

                <div className='h-4 mt-3'>
                    {goal != null && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1"><Target className="h-3 w-3"/> Meta: {goal.toLocaleString('pt-BR')} {unit}</p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};


export default function SummaryCards({ totalNutrients, nutrientGoals, isAnalysisPage = false }: SummaryCardsProps) {
  const titlePrefix = isAnalysisPage ? 'Média ' : '';

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
  
  const desktopData = summaryCardsData.map(d => ({ ...d, title: `${titlePrefix}${d.title}`}));

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {desktopData.map((card, index) => (
        <div key={card.title} className="animate-fade-in" style={{animationDelay: `${index * 100}ms`}}>
            <SummaryCard {...card} />
        </div>
      ))}
    </div>
  );
}
