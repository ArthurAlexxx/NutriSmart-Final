
// src/components/dashboard-charts.tsx
'use client';

import * as React from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Label, LabelList, Pie, PieChart, ResponsiveContainer, XAxis, YAxis, Cell, LineChart, Line } from 'recharts';
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';

const caloriesChartConfig = {
  calories: {
    label: 'Calorias',
    color: 'hsl(var(--chart-1))',
  },
} satisfies ChartConfig;

const hydrationChartConfig = {
  intake: {
    label: 'Consumo (ml)',
    color: 'hsl(var(--chart-2))',
  },
} satisfies ChartConfig;

const weightChartConfig = {
  weight: {
    label: 'Peso (kg)',
    color: 'hsl(var(--chart-4))',
  },
} satisfies ChartConfig;


const macrosChartConfig = {
  value: {
    label: 'Gramas',
  },
  Proteínas: {
    label: 'Proteínas',
    color: 'hsl(var(--chart-1))',
  },
  Carboidratos: {
    label: 'Carboidratos',
    color: 'hsl(var(--chart-3))',
  },
  Gorduras: {
    label: 'Gorduras',
    color: 'hsl(var(--chart-2))',
  },
} satisfies ChartConfig;

interface DashboardChartsProps {
    chartType: 'calories' | 'macros' | 'hydration' | 'weight';
    data: any[];
}

const generateTicks = (data: any[], key: string, step: number, minMax: number) => {
    if (!data || data.length === 0) return [0, minMax];
    
    let maxValue = Math.max(...data.map(item => item[key] || 0));
    if (maxValue < minMax) {
      maxValue = minMax;
    }

    const roundedMax = Math.ceil(maxValue / step) * step;
    if (roundedMax === 0) return [0, step];
    
    const ticks = [];
    for (let i = 0; i <= roundedMax; i += step) {
        ticks.push(i);
    }
    return ticks;
};

export function DashboardCharts({ chartType, data }: DashboardChartsProps) {
  if (chartType === 'calories') {
     const calorieTicks = generateTicks(data, 'calories', 200, 1000);

    return (
       <ChartContainer
        config={caloriesChartConfig}
        className="min-h-[250px] w-full"
      >
        <LineChart
          data={data}
          margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
        >
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis
            dataKey="day"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tickFormatter={(value) => value.slice(0, 5)}
            tick={{ fontSize: 12 }}
          />
           <YAxis 
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tick={{ fontSize: 12 }}
            domain={[0, Math.max(...calorieTicks)]}
            ticks={calorieTicks}
           />
          <ChartTooltip
            cursor={true}
            content={
              <ChartTooltipContent
                indicator="dot"
              />
            }
          />
          <Line
            dataKey="calories"
            type="monotone"
            stroke="var(--color-calories)"
            strokeWidth={2.5}
            dot={{
              r: 4,
              fill: 'var(--color-calories)',
              strokeWidth: 2,
              stroke: 'hsl(var(--background))',
            }}
            activeDot={{
                r: 6,
                strokeWidth: 2,
            }}
          />
        </LineChart>
      </ChartContainer>
    );
  }
  
  if (chartType === 'hydration') {
     const hydrationTicks = generateTicks(data, 'intake', 250, 1000);
    return (
      <ChartContainer config={hydrationChartConfig} className="min-h-[250px] w-full">
        <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data} margin={{ top: 20, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3"/>
                <XAxis dataKey="day" tickLine={false} tickMargin={8} axisLine={false} stroke="#888888" fontSize={12} tickFormatter={(value) => value.slice(0, 5)} />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} stroke="#888888" fontSize={12} unit="ml" domain={[0, Math.max(...hydrationTicks)]} ticks={hydrationTicks} />
                <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent indicator="dot" />}
                />
                <Bar dataKey="intake" fill="hsl(var(--chart-2))" radius={[5, 5, 0, 0]}>
                  <LabelList dataKey="intake" position="top" offset={8} className="fill-foreground" fontSize={12} />
                </Bar>
            </BarChart>
        </ResponsiveContainer>
      </ChartContainer>
    );
  }

  if (chartType === 'weight') {
    const weightTicks = generateTicks(data, 'weight', 5, 60);
    return (
       <ChartContainer
        config={weightChartConfig}
        className="min-h-[250px] w-full"
      >
        <LineChart
          data={data}
          margin={{ top: 10, right: 20, left: 10, bottom: 0 }}
        >
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis
            dataKey="day"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tickFormatter={(value) => value.slice(0, 5)}
             tick={{ fontSize: 12 }}
          />
           <YAxis 
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tick={{ fontSize: 12 }}
            domain={['dataMin - 2', 'dataMax + 2']}
            unit="kg"
            allowDecimals={true}
           />
          <ChartTooltip
            cursor={true}
            content={
              <ChartTooltipContent
                indicator="dot"
                formatter={(value) => [`${(value as number).toFixed(1)} kg`, 'Peso']}
              />
            }
          />
          <Line
            dataKey="weight"
            type="monotone"
            stroke="var(--color-weight)"
            strokeWidth={2.5}
            dot={{
              r: 4,
              fill: 'var(--color-weight)',
              strokeWidth: 2,
              stroke: 'hsl(var(--background))',
            }}
            activeDot={{
                r: 6,
                strokeWidth: 2,
            }}
            connectNulls={true}
          />
        </LineChart>
      </ChartContainer>
    );
  }

  if (chartType === 'macros') {
     const totalValue = React.useMemo(() => {
      return data.reduce((acc, curr) => acc + curr.value, 0);
    }, [data]);
    
    return (
      <ChartContainer
        config={macrosChartConfig}
        className="mx-auto aspect-square max-h-[250px]"
      >
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={65}
              outerRadius={90}
              strokeWidth={2}
              paddingAngle={5}
            >
               {data.map((entry) => (
                <Cell key={`cell-${entry.name}`} fill={entry.fill} />
              ))}
               <Label
                content={({ viewBox }) => {
                  if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                    return (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        <tspan
                          x={viewBox.cx}
                          y={viewBox.cy}
                          className="fill-foreground text-3xl font-bold"
                        >
                          {totalValue.toFixed(0)}g
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 20}
                          className="fill-muted-foreground text-sm"
                        >
                          Total
                        </tspan>
                      </text>
                    )
                  }
                }}
              />
            </Pie>
             <ChartLegend
                content={<ChartLegendContent nameKey="name" className="flex-wrap" />}
                className="mt-2"
             />
          </PieChart>
        </ResponsiveContainer>
      </ChartContainer>
    );
  }

  return null;
}
