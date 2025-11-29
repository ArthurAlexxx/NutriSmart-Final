// src/components/analysis/charts-view.tsx
'use client';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DashboardCharts } from '@/components/dashboard-charts';
import { TrendingUp, GlassWater, Weight, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChartData {
  caloriesData: any[];
  hydrationData: any[];
  weightData: any[];
}

type ChartType = 'calories' | 'weight' | 'hydration';

const chartOptions: { value: ChartType; label: string; Icon: React.ElementType; description: string; instructions: string; }[] = [
    { 
        value: 'calories', 
        label: 'Calorias', 
        Icon: TrendingUp, 
        description: 'Acompanhe sua ingestão de calorias ao longo do período selecionado. Este gráfico ajuda a visualizar picos de consumo e a consistência da sua dieta em relação às suas metas.',
        instructions: 'Os dados são preenchidos automaticamente cada vez que você adiciona uma refeição no seu Diário. Continue registrando para ver suas tendências.'
    },
    { 
        value: 'weight', 
        label: 'Peso', 
        Icon: Weight, 
        description: 'Visualize a evolução do seu peso corporal. Este gráfico é essencial para entender se você está no caminho certo para atingir seu peso-meta, mostrando tendências de ganho, perda ou manutenção.',
        instructions: 'Para adicionar dados, clique em "Ajustar Metas" no seu Diário e atualize seu peso atual. O ideal é se pesar sempre nas mesmas condições (ex: pela manhã, em jejum).'
    },
    { 
        value: 'hydration', 
        label: 'Hidratação', 
        Icon: GlassWater, 
        description: 'Monitore seu consumo diário de água. Manter-se hidratado é crucial para o bem-estar e desempenho. Este gráfico mostra se você está atingindo sua meta diária de hidratação.',
        instructions: 'Adicione ou remova copos de água diretamente no card de Hidratação na página do seu Diário para atualizar este gráfico.'
    },
];


export default function ChartsView({ caloriesData, hydrationData, weightData }: ChartData) {
  const [activeChart, setActiveChart] = useState<ChartType>('calories');

  const chartDataMap = {
    calories: caloriesData,
    weight: weightData,
    hydration: hydrationData,
  };
  
  const selectedChartInfo = chartOptions.find(opt => opt.value === activeChart)!;

  return (
    <Card className="shadow-lg rounded-2xl w-full overflow-hidden animate-fade-in">
        <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div>
                     <CardTitle className="text-xl font-semibold text-foreground">Visualização de Gráficos</CardTitle>
                     <CardDescription className="text-sm text-muted-foreground mt-1">Selecione uma métrica para analisar em detalhes.</CardDescription>
                </div>
                <div className="w-full sm:w-auto grid grid-cols-3 gap-2 p-1 rounded-lg bg-muted">
                     {chartOptions.map((option) => (
                        <Button 
                            key={option.value} 
                            onClick={() => setActiveChart(option.value)}
                            variant={activeChart === option.value ? 'primary' : 'ghost'}
                            size="sm"
                            className={cn(
                                "flex items-center gap-2", 
                                activeChart === option.value && 'bg-background text-foreground shadow-sm hover:bg-background/90'
                            )}
                        >
                            <option.Icon className={cn("h-4 w-4", activeChart === option.value && 'text-primary')} />
                           <span className='hidden sm:inline'>{option.label}</span>
                        </Button>
                    ))}
                </div>
            </div>
        </CardHeader>
        <CardContent className="pt-2">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center min-h-[350px]">
                {/* Left Column: Description */}
                <div className="lg:col-span-1 space-y-4 animate-fade-in" key={activeChart}>
                     <h3 className="text-lg font-semibold flex items-center gap-2 text-foreground">
                        <selectedChartInfo.Icon className="h-5 w-5 text-primary"/>
                        Sobre o Gráfico de {selectedChartInfo.label}
                    </h3>
                    <p className="text-muted-foreground text-sm">
                        {selectedChartInfo.description}
                    </p>
                    <div className="bg-secondary/50 border-l-4 border-primary/50 text-left p-4 rounded-r-lg">
                        <div className="flex">
                            <div className="py-1"><Info className="h-5 w-5 text-primary mr-3"/></div>
                            <div>
                                <p className="font-semibold text-foreground">Como Adicionar Dados?</p>
                                <p className="text-sm text-muted-foreground">{selectedChartInfo.instructions}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Chart */}
                <div className="lg:col-span-2 pl-2 pr-4 sm:pl-4">
                     <DashboardCharts chartType={activeChart} data={chartDataMap[activeChart]} />
                </div>
            </div>
        </CardContent>
    </Card>
  );
}
