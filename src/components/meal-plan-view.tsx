
// src/components/meal-plan-view.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { type ActivePlan, type MealPlanItem } from '@/types/user';
import { Droplet, Flame, Utensils, Target, Soup, Clock, Rocket, Trash2, Loader2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Button } from './ui/button';

const PlanMealItem = ({ meal }: { meal: MealPlanItem }) => (
    <div className="rounded-2xl border p-4 space-y-4 relative bg-card shadow-lg">
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
  <div className="flex items-center gap-4 rounded-2xl border p-4 bg-card shadow-lg">
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
    <Card className="max-w-2xl mx-auto shadow-lg rounded-2xl animate-fade-in border-dashed mt-8">
        <CardHeader className="text-center p-8">
            <Soup className="h-12 w-12 text-primary mx-auto mb-4" />
            <CardTitle className="text-2xl">Nenhum Plano Alimentar Ativo</CardTitle>
            <CardDescription className="mt-2 max-w-md mx-auto">
                Use o assistente de IA para gerar um plano personalizado ou aguarde seu nutricionista criar um para você.
            </CardDescription>
        </CardHeader>
    </Card>
);

interface MealPlanViewProps {
  plan: ActivePlan | null;
  onPlanDelete?: () => void;
}

export default function MealPlanView({ plan, onPlanDelete }: MealPlanViewProps) {
  
  if (!plan || !plan.calorieGoal) {
    return <EmptyPlanState />;
  }
  
  const proteinGoal = plan.proteinGoal || Math.round((plan.calorieGoal * 0.35) / 4);

  return (
    <div className='animate-fade-in space-y-8 max-w-4xl mx-auto'>
        <section>
            <div className="flex justify-between items-center mb-2">
                <div className='flex-1'>
                    <h2 className='text-2xl font-bold text-foreground flex items-center gap-2 font-heading'><Target className='h-6 w-6 text-primary' /> Metas Diárias</h2>
                    <p className='text-muted-foreground mt-1'>Estas são as metas definidas para o plano que está ativo no momento.</p>
                </div>
                 {onPlanDelete && (
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                                <Trash2 className="h-5 w-5" />
                                <span className='sr-only'>Excluir Plano</span>
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                            <AlertDialogDescription>
                                Esta ação removerá permanentemente seu plano alimentar ativo. Você poderá gerar um novo a qualquer momento. Deseja continuar?
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={onPlanDelete} className="bg-destructive hover:bg-destructive/90">
                                Confirmar Exclusão
                            </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                 )}
            </div>
            <div className='grid grid-cols-1 md:grid-cols-3 gap-4 mt-4'>
                <InfoCard icon={Flame} title="Calorias" value={plan.calorieGoal} unit="kcal" color="bg-orange-400" />
                <InfoCard icon={Rocket} title="Proteínas" value={proteinGoal} unit="g" color="bg-blue-400" />
                <InfoCard icon={Droplet} title="Hidratação" value={plan.hydrationGoal / 1000} unit="L" color="bg-sky-400" />
            </div>
        </section>

        <section>
            <h2 className='text-2xl font-bold text-foreground mb-2 flex items-center gap-2 font-heading'><Utensils className='h-6 w-6 text-primary' /> Refeições</h2>
            <p className='text-muted-foreground mb-4'>Siga este guia de refeições para atingir suas metas.</p>
             <div className='space-y-4'>
                 {plan.meals && plan.meals.length > 0 ? (
                    plan.meals.map((meal, index) => (
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
