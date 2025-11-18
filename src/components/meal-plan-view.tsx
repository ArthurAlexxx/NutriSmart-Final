
// src/components/meal-plan-view.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { type Room } from '@/types/room';
import { type UserProfile } from '@/types/user';
import { Droplet, Flame, Utensils, Target, CalendarX, Info, Clock, Soup, Rocket } from 'lucide-react';

const PlanMealItem = ({ meal }: { meal: Room['activePlan']['meals'][0] }) => (
    <div className="rounded-2xl border p-4 space-y-4 relative bg-card shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
            <div>
                <p className="text-sm font-medium text-muted-foreground">Tipo de Refeição</p>
                <p className="font-semibold text-foreground">{meal.name}</p>
            </div>
            <div>
                <p className="text-sm font-medium text-muted-foreground">Horário</p>
                <p className="font-semibold text-foreground flex items-center gap-2"><Clock className='h-4 w-4 text-primary' /> {meal.time}</p>
            </div>
        </div>
        <div>
            <p className="text-sm font-medium text-muted-foreground">Itens da Refeição</p>
            <p className="text-base text-foreground whitespace-pre-line mt-1">{meal.items}</p>
        </div>
    </div>
);

const InfoCard = ({ icon: Icon, title, value, unit, color }: { icon: React.ElementType, title: string, value: number, unit: string, color: string }) => (
  <div className="flex items-center gap-4 rounded-2xl border p-4 bg-card shadow-sm">
    <div className={`flex items-center justify-center h-12 w-12 rounded-full ${color}`}>
      <Icon className="h-6 w-6 text-white" />
    </div>
    <div>
      <p className="text-muted-foreground">{title}</p>
      <p className="text-2xl font-bold">
        {value} <span className="text-base font-normal">{unit}</span>
      </p>
    </div>
  </div>
);

const EmptyPlanState = () => (
    <Card className="max-w-2xl mx-auto shadow-sm rounded-2xl animate-fade-in border-dashed mt-8">
        <CardHeader className="text-center p-8">
            <Soup className="h-12 w-12 text-primary mx-auto mb-4" />
            <CardTitle className="text-2xl">Nenhum Plano Alimentar Ativo</CardTitle>
            <CardDescription className="mt-2 max-w-md mx-auto">
                No momento, você não tem um plano alimentar ativo.
            </CardDescription>
        </CardHeader>
        <CardContent className="p-8 pt-0 text-center">
             <div className="bg-secondary/50 border-l-4 border-primary/50 text-left p-4 rounded-r-lg">
                <div className="flex">
                    <div className="py-1"><Info className="h-5 w-5 text-primary mr-3"/></div>
                    <div>
                        <p className="font-semibold text-foreground">Dica:</p>
                        <p className="text-sm text-muted-foreground">Use o assistente "Meu Plano (IA)" para gerar um novo plano personalizado ou, se estiver em acompanhamento, peça para seu nutricionista criar um para você.</p>
                    </div>
                </div>
            </div>
        </CardContent>
    </Card>
);

interface MealPlanViewProps {
  room: Room | null;
  userProfile?: UserProfile | null;
}

export default function MealPlanView({ room, userProfile }: MealPlanViewProps) {
  const activePlan = room?.activePlan || userProfile?.activePlan;

  if (!activePlan || !activePlan.calorieGoal) {
    return <EmptyPlanState />;
  }
  
  const proteinGoal = activePlan.proteinGoal || Math.round((activePlan.calorieGoal * 0.35) / 4);


  return (
    <div className='animate-fade-in space-y-8 max-w-4xl mx-auto'>
        <section>
            <h2 className='text-2xl font-bold text-foreground mb-2 flex items-center gap-2 font-heading'><Target className='h-6 w-6 text-primary' /> Metas Diárias do Plano Ativo</h2>
            <p className='text-muted-foreground mb-4'>Estas são as metas definidas para o plano que está ativo no momento.</p>
            <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                <InfoCard icon={Flame} title="Calorias" value={activePlan.calorieGoal} unit="kcal" color="bg-orange-400" />
                <InfoCard icon={Rocket} title="Proteínas" value={proteinGoal} unit="g" color="bg-blue-400" />
                <InfoCard icon={Droplet} title="Hidratação" value={activePlan.hydrationGoal / 1000} unit="L" color="bg-sky-400" />
            </div>
        </section>

        <section>
            <h2 className='text-2xl font-bold text-foreground mb-2 flex items-center gap-2 font-heading'><Utensils className='h-6 w-6 text-primary' /> Refeições</h2>
            <p className='text-muted-foreground mb-4'>Siga este guia de refeições para atingir suas metas.</p>
             <div className='space-y-4'>
                 {activePlan.meals && activePlan.meals.length > 0 ? (
                    activePlan.meals.map((meal, index) => (
                        <PlanMealItem key={meal.id || index} meal={meal} />
                    ))
                 ) : (
                    <div className="text-center py-12 px-4 rounded-lg border-2 border-dashed min-h-[200px] flex flex-col justify-center items-center">
                        <p className="font-medium text-muted-foreground">Nenhuma refeição foi definida neste plano.</p>
                    </div>
                 )}
             </div>
        </section>
    </div>
  );
}
