
// src/components/analysis/charts-view.tsx
'use client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DashboardCharts } from '@/components/dashboard-charts';
import { TrendingUp, GlassWater, Weight } from 'lucide-react';

interface ChartData {
  caloriesData: any[];
  hydrationData: any[];
  weightData: any[];
}

const chartOptions: { value: 'calories' | 'weight' | 'hydration', label: string, Icon: React.ElementType, description: string }[] = [
    { value: 'calories', label: 'Consumo de Calorias', Icon: TrendingUp, description: 'Sua ingestão de calorias ao longo do período selecionado.' },
    { value: 'weight', label: 'Acompanhamento de Peso', Icon: Weight, description: 'Sua evolução de peso ao longo do período selecionado.' },
    { value: 'hydration', label: 'Consumo de Água', Icon: GlassWater, description: 'Sua ingestão diária de água ao longo do tempo.' },
];


export default function ChartsView({ caloriesData, hydrationData, weightData }: ChartData) {
  
  const chartDataMap = {
    calories: caloriesData,
    weight: weightData,
    hydration: hydrationData,
  };

  return (
    <div className="grid grid-cols-1 gap-6">
      {chartOptions.map((option, index) => (
        <Card key={option.value} className="shadow-sm rounded-2xl w-full overflow-hidden animate-fade-in" style={{ animationDelay: `${index * 150}ms`}}>
            <CardHeader>
                <div className="flex items-center gap-4">
                    <div className="bg-primary/10 text-primary p-3 rounded-full">
                        <option.Icon className="h-6 w-6" />
                    </div>
                    <div>
                        <CardTitle className="text-lg font-semibold text-foreground">{option.label}</CardTitle>
                        <CardDescription className="text-sm text-muted-foreground">{option.description}</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="pt-0 pl-2 pr-4 sm:pl-4">
                <DashboardCharts chartType={option.value} data={chartDataMap[option.value]} />
            </CardContent>
        </Card>
      ))}
    </div>
  );
}
