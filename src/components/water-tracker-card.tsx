// src/components/water-tracker-card.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardFooter } from './ui/card';
import { Button } from './ui/button';
import { GlassWater, Plus, Minus } from 'lucide-react';
import { Progress } from './ui/progress';

interface WaterTrackerCardProps {
  waterIntake: number;
  waterGoal: number;
  onAddWater: () => void;
  onRemoveWater: () => void;
}

export default function WaterTrackerCard({ waterIntake, waterGoal, onAddWater, onRemoveWater }: WaterTrackerCardProps) {
  const progress = waterGoal > 0 ? Math.min((waterIntake / waterGoal) * 100, 100) : 0;

  return (
    <Card className="shadow-sm rounded-2xl flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 font-semibold text-lg">
            <GlassWater className="h-5 w-5 text-primary" />
            Hidratação
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2 flex-grow">
         <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold">
              {(waterIntake / 1000).toFixed(2)}
            </p>
            <p className="text-sm text-muted-foreground">/ {(waterGoal / 1000).toFixed(2)} L</p>
        </div>
        <Progress value={progress} className="mt-2 h-2" />
      </CardContent>
      <CardFooter className="p-4 pt-0 grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" onClick={onRemoveWater} disabled={waterIntake <= 0}>
            <Minus className="h-4 w-4 mr-2" /> 250ml
          </Button>
          <Button variant="outline" size="sm" onClick={onAddWater}>
            <Plus className="h-4 w-4 mr-2" /> 250ml
          </Button>
      </CardFooter>
    </Card>
  );
}
