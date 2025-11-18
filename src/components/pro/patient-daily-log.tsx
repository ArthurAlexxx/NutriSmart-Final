// src/components/pro/patient-daily-log.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { ptBR } from 'date-fns/locale';
import { type MealEntry } from '@/types/meal';
import { type HydrationEntry } from '@/types/hydration';
import ConsumedFoodsList from '../consumed-foods-list';
import WaterIntakeSummary from '../water-intake-summary';
import { UserX } from 'lucide-react';

interface PatientDailyLogProps {
  selectedDate: Date;
  onDateChange: (date: Date | undefined) => void;
  mealLog: MealEntry[];
  hydrationLog: HydrationEntry | null;
  patientId: string | null;
}

export default function PatientDailyLog({ selectedDate, onDateChange, mealLog, hydrationLog, patientId }: PatientDailyLogProps) {

  if (!patientId) {
    return (
       <Card className="animate-fade-in">
        <CardHeader>
          <CardTitle>Aguardando Paciente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-48 text-center rounded-xl bg-secondary/30">
            <UserX className="h-10 w-10 text-muted-foreground mb-4" />
            <p className="text-base font-medium text-muted-foreground">O paciente ainda não entrou na sala.</p>
            <p className="text-sm text-muted-foreground mt-1">Os registros diários aparecerão aqui quando ele aceitar o convite.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
        <div className="lg:col-span-1">
            <Card className="shadow-sm rounded-2xl">
                <CardContent className="p-2">
                    <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => onDateChange(date)}
                        className="w-full"
                        locale={ptBR}
                        disabled={(date) => date > new Date() || date < new Date("2020-01-01")}
                    />
                </CardContent>
            </Card>
        </div>
        <div className="lg:col-span-2 space-y-8">
            <WaterIntakeSummary hydrationEntry={hydrationLog} />
            <ConsumedFoodsList 
                mealEntries={mealLog}
                onMealDeleted={() => {}} // Professionals can't delete patient entries
                onMealEdit={() => {}}
            />
        </div>
    </div>
  );
}
