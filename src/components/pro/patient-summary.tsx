// src/components/pro/patient-summary.tsx
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { type Room } from '@/types/room';
import { User, Cake, Weight, Mail, Droplet, Flame, Utensils, CalendarDays, BarChart3, Target, ChevronDown } from 'lucide-react';
import { format, differenceInYears } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import SummaryCards from '../summary-cards';
import type { MealEntry } from '@/types/meal';
import type { HydrationEntry } from '@/types/hydration';
import WaterIntakeSummary from '../water-intake-summary';
import ConsumedFoodsList from '../consumed-foods-list';
import { Separator } from '../ui/separator';
import { useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';

interface PatientSummaryProps {
  room: Room;
  mealLog: MealEntry[];
  hydrationLog: HydrationEntry | null;
}

const InfoCard = ({ icon: Icon, title, value, subValue, noTruncate = false }: { icon: React.ElementType, title: string, value: string | number | undefined, subValue?: string, noTruncate?: boolean }) => (
    <Card className='shadow-sm'>
        <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium text-muted-foreground flex items-center gap-2'>
                <Icon className="h-4 w-4" />
                {title}
            </CardTitle>
        </CardHeader>
        <CardContent>
            <p className={`text-2xl font-bold ${noTruncate ? 'break-all' : 'truncate'}`} title={value ? String(value) : ''}>
                {value || 'N/A'}
            </p>
            {subValue && <p className='text-xs text-muted-foreground'>{subValue}</p>}
        </CardContent>
    </Card>
);

const PlanMealItem = ({ meal }: { meal: Room['activePlan']['meals'][0] }) => (
    <div className='p-4 rounded-lg border bg-background hover:bg-secondary/50 transition-colors'>
        <p className='font-semibold'>{meal.name} <span className='text-sm font-normal text-muted-foreground'>({meal.time})</span></p>
        <p className='text-sm text-muted-foreground whitespace-pre-line'>{meal.items}</p>
    </div>
)

export default function PatientSummary({ room, mealLog, hydrationLog }: PatientSummaryProps) {
  const [isInfoOpen, setIsInfoOpen] = useState(true);
  const creationDate = room.createdAt?.toDate ? format(room.createdAt.toDate(), "dd/MM/yyyy") : 'N/A';
  
  const totalNutrients = mealLog.reduce((acc, meal) => {
    acc.calorias += meal.mealData.totais.calorias;
    acc.proteinas += meal.mealData.totais.proteinas;
    acc.carboidratos += meal.mealData.totais.carboidratos;
    acc.gorduras += meal.mealData.totais.gorduras;
    return acc;
  }, { calorias: 0, proteinas: 0, carboidratos: 0, gorduras: 0 });

  return (
    <div className='animate-fade-in space-y-8'>
        <section>
             <Collapsible open={isInfoOpen} onOpenChange={setIsInfoOpen} className='mb-8'>
                <CollapsibleTrigger asChild>
                    <div className='flex justify-between items-center cursor-pointer hover:bg-secondary/50 p-2 rounded-lg'>
                        <h2 className='text-xl font-semibold text-foreground'>Informações Gerais</h2>
                        <Button variant="ghost" size="sm" className='w-9 p-0'>
                            <ChevronDown className={cn("h-5 w-5 transition-transform", isInfoOpen && 'rotate-180')}/>
                        </Button>
                    </div>
                </CollapsibleTrigger>
                <CollapsibleContent className='pt-4 animate-in fade-in-0'>
                    <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
                        <InfoCard icon={User} title="Nome" value={room.patientInfo.name} noTruncate={true}/>
                        <InfoCard icon={Mail} title="Email" value={room.patientInfo.email} noTruncate={true}/>
                        <InfoCard icon={Cake} title="Idade" value={room.patientInfo.age ? `${room.patientInfo.age} anos` : undefined} />
                        <InfoCard icon={Weight} title="Peso" value={room.patientInfo.weight ? `${room.patientInfo.weight} kg` : undefined} />
                    </div>
                </CollapsibleContent>
            </Collapsible>
        </section>
        
        <Separator />

        <section>
            <h2 className='text-xl font-semibold text-foreground mb-4'>Resumo do Dia do Paciente</h2>
            <SummaryCards
                totalNutrients={totalNutrients}
            />
        </section>

        <section>
            <h2 className='text-xl font-semibold text-foreground mb-4'>Registros de Hoje</h2>
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
                <div className="lg:col-span-2 space-y-8">
                    <ConsumedFoodsList 
                        mealEntries={mealLog}
                        onMealDeleted={() => {}}
                        onMealEdit={() => {}}
                    />
                </div>
                <div className="lg:col-span-1">
                   <WaterIntakeSummary hydrationEntry={hydrationLog} />
                </div>
            </div>
        </section>
        
        <Separator />

        <section>
            <h2 className='text-xl font-semibold text-foreground mb-4'>Plano Alimentar Ativo</h2>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Target className='h-5 w-5 text-primary' /> Metas Diárias</CardTitle>
                </CardHeader>
                <CardContent className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                    <div className='flex items-center gap-4 rounded-lg border p-4'>
                        <Flame className='h-8 w-8 text-orange-500' />
                        <div>
                            <p className='text-muted-foreground'>Meta de Calorias</p>
                            <p className='text-2xl font-bold'>{room.activePlan.calorieGoal} <span className='text-base font-normal'>kcal</span></p>
                        </div>
                    </div>
                     <div className='flex items-center gap-4 rounded-lg border p-4'>
                        <Droplet className='h-8 w-8 text-blue-500' />
                        <div>
                            <p className='text-muted-foreground'>Meta de Hidratação</p>
                            <p className='text-2xl font-bold'>{room.activePlan.hydrationGoal / 1000} <span className='text-base font-normal'>L</span></p>
                        </div>
                    </div>
                </CardContent>
                 <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Utensils className='h-5 w-5 text-primary' /> Refeições</CardTitle>
                </CardHeader>
                 <CardContent className='space-y-4'>
                    {room.activePlan.meals.length > 0 ? (
                        room.activePlan.meals.map((meal, index) => (
                            <PlanMealItem key={index} meal={meal} />
                        ))
                    ) : (
                        <p className='text-muted-foreground text-center py-4'>Nenhuma refeição definida no plano.</p>
                    )}
                 </CardContent>
            </Card>
        </section>
    </div>
  );
}
