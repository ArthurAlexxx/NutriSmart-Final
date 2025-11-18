// src/components/analysis/insights-card.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Lightbulb, Loader2, ListChecks } from 'lucide-react';

interface InsightsCardProps {
  insights: string[];
  isLoading: boolean;
}

export default function InsightsCard({ insights, isLoading }: InsightsCardProps) {
  return (
    <Card className="shadow-sm rounded-2xl w-full bg-background animate-fade-in-down">
      <CardContent className='p-6'>
        {isLoading ? (
          <div className="flex items-center justify-center min-h-[100px] text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            <span>Analisando seus dados...</span>
          </div>
        ) : insights.length > 0 ? (
          <ul className="space-y-3">
            {insights.map((insight, index) => (
              <li key={index} className="flex items-start gap-3">
                <ListChecks className="h-5 w-5 mt-1 text-primary flex-shrink-0" />
                <span className="text-foreground">{insight}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-center text-muted-foreground min-h-[100px] flex items-center justify-center">
            Continue registrando seus dados para receber insights.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
