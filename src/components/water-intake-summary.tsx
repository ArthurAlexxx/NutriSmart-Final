// src/components/water-intake-summary.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { GlassWater } from 'lucide-react';
import type { HydrationEntry } from '@/types/hydration';

interface WaterIntakeSummaryProps {
  hydrationEntry: HydrationEntry | null;
  monthlyTotal?: number;
  monthlyGoal?: number;
}

export default function WaterIntakeSummary({ hydrationEntry, monthlyTotal, monthlyGoal }: WaterIntakeSummaryProps) {
  
  if (monthlyTotal !== undefined && monthlyGoal !== undefined) {
      const progress = monthlyGoal > 0 ? Math.min((monthlyTotal / monthlyGoal) * 100, 100) : 0;
      return (
        <Card className="shadow-sm rounded-2xl animate-fade-in">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Hidratação Total do Mês</CardTitle>
            <GlassWater className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(monthlyTotal / 1000).toFixed(2)}
              <span className="text-lg text-muted-foreground ml-1">L</span>
            </div>
            <p className="text-xs text-muted-foreground">Meta Mensal: {(monthlyGoal / 1000).toFixed(2)} L</p>
            <Progress value={progress} className="mt-4 h-2" />
          </CardContent>
        </Card>
      )
  }

  const intake = hydrationEntry?.intake || 0;
  const goal = hydrationEntry?.goal || 2000;
  const progress = goal > 0 ? Math.min((intake / goal) * 100, 100) : 0;
  
  if (!hydrationEntry) {
    return (
      <Card className="shadow-sm rounded-2xl animate-fade-in">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Hidratação</CardTitle>
          <GlassWater className="h-5 w-5 text-primary" />
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mt-2">Nenhum dado de hidratação registrado para este dia.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm rounded-2xl animate-fade-in">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Hidratação</CardTitle>
        <GlassWater className="h-5 w-5 text-primary" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {(intake / 1000).toFixed(2)}
          <span className="text-lg text-muted-foreground ml-1">L</span>
        </div>
        <p className="text-xs text-muted-foreground">Meta: {(goal / 1000).toFixed(2)} L</p>
        <Progress value={progress} className="mt-4 h-2" />
      </CardContent>
    </Card>
  );
}
