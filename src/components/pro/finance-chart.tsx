// src/components/pro/finance-chart.tsx
'use client';

import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { FinancialTransaction } from '@/types/finance';
import { getWeekOfMonth, startOfMonth } from 'date-fns';

interface FinanceChartProps {
  transactions: FinancialTransaction[];
}

export default function FinanceChart({ transactions }: FinanceChartProps) {

  const chartData = useMemo(() => {
    const weeklyData: { [key: number]: { name: string; income: number; expense: number } } = {
      1: { name: 'Semana 1', income: 0, expense: 0 },
      2: { name: 'Semana 2', income: 0, expense: 0 },
      3: { name: 'Semana 3', income: 0, expense: 0 },
      4: { name: 'Semana 4', income: 0, expense: 0 },
      5: { name: 'Semana 5', income: 0, expense: 0 },
    };

    transactions.forEach(t => {
      const date = t.date.toDate();
      // Use { weekStartsOn: 1 } to consider Monday as the first day of the week
      const weekOfMonth = getWeekOfMonth(date, { weekStartsOn: 1 });
      
      if (weeklyData[weekOfMonth]) {
        if (t.type === 'income') {
          weeklyData[weekOfMonth].income += t.amount;
        } else {
          weeklyData[weekOfMonth].expense += t.amount;
        }
      }
    });

    return Object.values(weeklyData);
  }, [transactions]);
  
  const formatCurrency = (value: number) => `R$ ${value.toFixed(2).replace('.', ',')}`;
  
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border bg-background p-2 shadow-sm">
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col space-y-1">
              <span className="text-[0.70rem] uppercase text-muted-foreground">
                {label}
              </span>
              <span className="font-bold text-muted-foreground">
                Receitas
              </span>
              <span className="font-bold text-muted-foreground">
                Despesas
              </span>
            </div>
            <div className="flex flex-col space-y-1">
              <span className="text-[0.70rem] uppercase text-muted-foreground text-right">
                Total
              </span>
              <span className="font-bold text-right" style={{ color: 'hsl(var(--chart-1))' }}>
                {formatCurrency(payload[0].value)}
              </span>
               <span className="font-bold text-right" style={{ color: 'hsl(var(--chart-4))' }}>
                {formatCurrency(payload[1].value)}
              </span>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Desempenho Financeiro Semanal</CardTitle>
        <CardDescription>Receitas vs. Despesas no período selecionado.</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
           <BarChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
             <CartesianGrid strokeDasharray="3 3" vertical={false}/>
             <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
             <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value: number) => `R$${value/1000}k`} />
             <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} content={<CustomTooltip />} />
             <Legend wrapperStyle={{ fontSize: '14px' }}/>
             <Bar dataKey="income" name="Receita" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
             <Bar dataKey="expense" name="Despesa" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
