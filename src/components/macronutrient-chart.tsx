// src/components/macronutrient-chart.tsx
'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { DashboardCharts } from './dashboard-charts';
import { Flame } from 'lucide-react';
import { Target } from 'lucide-react';

interface MacronutrientChartProps {
  totalNutrients: {
    calorias: number;
    proteinas: number;
    carboidratos?: number;
    gorduras?: number;
  };
  nutrientGoals?: {
    calories: number;
    protein: number;
  };
}

export default function MacronutrientChart({ totalNutrients, nutrientGoals }: MacronutrientChartProps) {
  const { calorias, proteinas, carboidratos = 0, gorduras = 0 } = totalNutrients;

  const macroData = React.useMemo(() => {
    return [
      { name: 'Proteínas', value: proteinas, fill: 'hsl(var(--chart-1))' },
      { name: 'Carboidratos', value: carboidratos, fill: 'hsl(var(--chart-3))' },
      { name: 'Gorduras', value: gorduras, fill: 'hsl(var(--chart-2))' },
    ].filter(item => item.value > 0);
  }, [proteinas, carboidratos, gorduras]);

  return (
    <Card className="shadow-sm rounded-2xl">
      <CardHeader>
        <CardTitle className='flex items-center gap-2 font-semibold text-lg'>
          <Flame className='h-6 w-6 text-primary'/>
          Resumo do Dia
        </CardTitle>
        <CardDescription>Distribuição de macronutrientes e total de calorias.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center">
        {macroData.length > 0 ? (
          <DashboardCharts chartType="macros" data={macroData} />
        ) : (
          <div className="flex flex-col items-center justify-center h-[250px] text-center">
            <p className="text-muted-foreground">Nenhuma refeição registrada ainda.</p>
          </div>
        )}
        <div className="mt-4 text-center">
             <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                <Target className="h-3 w-3"/> 
                Meta de Calorias: {nutrientGoals?.calories.toLocaleString('pt-BR') || 'N/A'} kcal
             </p>
        </div>
      </CardContent>
    </Card>
  );
}
