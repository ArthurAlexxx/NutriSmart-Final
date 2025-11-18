// src/components/analysis/charts-view.tsx
'use client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DashboardCharts } from '@/components/dashboard-charts';
import { TrendingUp, GlassWater, Weight, ChevronDown } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { cn } from '@/lib/utils';

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
    <Accordion type="single" collapsible className="w-full space-y-4">
      {chartOptions.map((option) => (
        <AccordionItem value={option.value} key={option.value} className="border-none">
           <Card className="shadow-sm rounded-2xl w-full overflow-hidden">
                <AccordionTrigger className="p-6 hover:no-underline text-left">
                    <div className="flex items-center gap-4">
                        <div className="bg-primary/10 text-primary p-3 rounded-full">
                            <option.Icon className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-foreground">{option.label}</h3>
                            <p className="text-sm text-muted-foreground">{option.description}</p>
                        </div>
                    </div>
                </AccordionTrigger>
                <AccordionContent>
                    <div className="pt-0 p-6">
                        <DashboardCharts chartType={option.value} data={chartDataMap[option.value]} />
                    </div>
                </AccordionContent>
            </Card>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
