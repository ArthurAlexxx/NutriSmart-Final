
// src/app/plan/page.tsx
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { doc, onSnapshot, Unsubscribe, collection, query, where, deleteDoc, orderBy, setDoc, addDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/app-layout';
import { Loader2, BookCopy, BrainCircuit, ChevronsUpDown, History, BookUp, Trash2, BookMarked } from 'lucide-react';
import type { UserProfile } from '@/types/user';
import type { ActivePlan } from '@/types/plan';
import type { Room } from '@/types/room';
import PlanEditor from '@/app/pro/plan-editor';
import MealPlanView from '@/components/meal-plan-view';
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from '@/hooks/use-toast';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import SubscriptionOverlay from '@/components/subscription-overlay';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';
import { isEqual } from 'lodash';

const PlanHistoryCard = ({ plan, onRestore, isRestoring, isCurrent }: { plan: ActivePlan; onRestore: (plan: ActivePlan) => void; isRestoring: boolean; isCurrent: boolean; }) => {
    return (
        <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader>
                <CardTitle className="text-lg">{plan.name || 'Plano Antigo'}</CardTitle>
                <CardDescription>
                    Criado em: {plan.createdAt ? format(plan.createdAt.toDate(), 'dd/MM/yyyy HH:mm') : 'Data desconhecida'}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Button onClick={() => onRestore(plan)} className="w-full" disabled={isRestoring || isCurrent}>
                    {isRestoring ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BookUp className="mr-2 h-4 w-4" />}
                    {isCurrent ? 'Plano Ativo' : 'Restaurar este Plano'}
                </Button>
            </CardContent>
        </Card>
    );
};


export default function PlanPage() {
  const { user, userProfile, isUserLoading, onProfileUpdate, effectiveSubscriptionStatus } = useUser();
  const router = useRouter();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [room, setRoom] = useState<Room | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  
  const isUnderProfessionalCare = !!userProfile?.patientRoomId;
  const isFeatureLocked = effectiveSubscriptionStatus === 'free';

  const activePlanRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid, 'plans', 'active');
  }, [user, firestore]);
  
  const planHistoryQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, 'users', user.uid, 'plan_history'), orderBy('createdAt', 'desc'));
  }, [user, firestore]);

  const { data: activePlan, isLoading: isPlanLoading } = useDoc<ActivePlan>(activePlanRef);
  const { data: planHistory, isLoading: isHistoryLoading } = useCollection<ActivePlan>(planHistoryQuery);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);


  useEffect(() => {
    const isOverallLoading = isUserLoading || isPlanLoading || isHistoryLoading;

    if (!isOverallLoading && userProfile?.patientRoomId && firestore) {
      const roomRef = doc(firestore, 'rooms', userProfile.patientRoomId);
      const unsubRoom = onSnapshot(roomRef, (doc) => {
        if (doc.exists()) {
          setRoom({ id: doc.id, ...doc.data() } as Room);
        } else {
          setRoom(null);
        }
        setLoading(false);
      }, (error) => {
        console.error("Error fetching room data:", error);
        toast({ title: "Erro ao carregar plano", description: "Não foi possível buscar os dados do seu nutricionista.", variant: "destructive" });
        setLoading(false);
      });
      return () => unsubRoom();
    } else {
      setLoading(isOverallLoading);
    }
  }, [isUserLoading, isPlanLoading, isHistoryLoading, userProfile, firestore, toast]);
  

  const handlePlanDelete = useCallback(async () => {
    if (!activePlanRef || !firestore || !user) {
        toast({ title: "Erro", description: "Referência do plano não encontrada.", variant: "destructive" });
        return;
    }
    
    try {
        if (activePlan) {
            const historyRef = collection(firestore, 'users', user.uid, 'plan_history');
            await addDoc(historyRef, activePlan);
        }
        await deleteDoc(activePlanRef);
        toast({ title: "Plano Removido", description: "Seu plano alimentar foi movido para o histórico." });
    } catch (error) {
        console.error("Error deleting plan:", error);
        toast({ title: "Erro ao Remover", description: "Não foi possível remover o plano.", variant: "destructive" });
    }
  }, [activePlan, activePlanRef, firestore, user, toast]);

  const handleRestorePlan = useCallback(async (planToRestore: ActivePlan) => {
      if (!firestore || !user || !activePlanRef) return;
      
      setIsRestoring(true);
      
      try {
          // Archive the current active plan if it exists
          if (activePlan) {
              const historyRef = collection(firestore, 'users', user.uid, 'plan_history');
              await addDoc(historyRef, activePlan);
          }

          // Remove the restored plan from history collection
          if (planToRestore.id) {
            const planHistoryRef = doc(firestore, 'users', user.uid, 'plan_history', planToRestore.id);
            await deleteDoc(planHistoryRef);
          }
          
          // Set the selected plan as the new active plan
          const newActiveData = { ...planToRestore };
          delete newActiveData.id; // remove old history ID
          await setDoc(activePlanRef, newActiveData);

          toast({
              title: "Plano Restaurado!",
              description: `O plano "${planToRestore.name || 'Plano Antigo'}" agora está ativo.`,
          });
      } catch (error) {
          console.error("Error restoring plan:", error);
          toast({ title: "Erro ao Restaurar", description: "Não foi possível restaurar o plano.", variant: "destructive" });
      } finally {
        setIsRestoring(false);
      }

  }, [firestore, user, activePlanRef, activePlan, toast]);

  if (loading) {
    return (
        <AppLayout user={user} userProfile={userProfile} onProfileUpdate={onProfileUpdate}>
            <div className="flex min-h-[calc(100vh-150px)] w-full flex-col items-center justify-center">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
                <p className="mt-4 text-muted-foreground">Carregando seu plano...</p>
            </div>
      </AppLayout>
    );
  }
  
  const proPlan = room?.activePlan;
  const myPlan = activePlan;

  const comparePlans = (planA?: ActivePlan | null, planB?: ActivePlan | null) => {
    if (!planA || !planB) return false;
    // Compare essential fields, ignoring IDs and creation dates
    return isEqual({
        name: planA.name,
        calorieGoal: planA.calorieGoal,
        proteinGoal: planA.proteinGoal,
        hydrationGoal: planA.hydrationGoal,
        meals: planA.meals.map(m => ({name: m.name, time: m.time, items: m.items})),
    }, {
        name: planB.name,
        calorieGoal: planB.calorieGoal,
        proteinGoal: planB.proteinGoal,
        hydrationGoal: planB.hydrationGoal,
        meals: planB.meals.map(m => ({name: m.name, time: m.time, items: m.items})),
    });
  }

  return (
    <AppLayout
        user={user}
        userProfile={userProfile}
        onProfileUpdate={onProfileUpdate}
    >
      <div className="w-full flex flex-col items-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-7xl relative pb-16 sm:pb-8">
            {isFeatureLocked && <SubscriptionOverlay />}
            <div className={cn(isFeatureLocked && 'blur-md pointer-events-none')}>
                <Tabs defaultValue={isUnderProfessionalCare ? "pro-plan" : "my-plan"} className="w-full">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8 animate-fade-in text-center sm:text-left">
                    <div className="flex-1 text-center sm:text-left">
                        <h2 className='text-3xl font-bold font-heading flex items-center gap-3 justify-center sm:justify-start'>
                           <BookMarked className='h-8 w-8 text-primary'/>
                            Meu Plano Alimentar
                        </h2>
                        <p className='text-muted-foreground mt-1 max-w-2xl mx-auto sm:mx-0'>
                            {isUnderProfessionalCare
                                ? "Alterne entre o plano do seu nutricionista e o seu plano pessoal gerado por IA."
                                : "Visualize seu plano ativo ou use nosso assistente para gerar um novo plano sob medida."
                            }
                        </p>
                    </div>
                    {isUnderProfessionalCare && (
                        <TabsList className="grid w-full sm:w-auto grid-cols-2">
                        <TabsTrigger value="pro-plan" className="w-full">
                            <BookCopy className="mr-2 h-4 w-4" /> Plano do Nutri
                        </TabsTrigger>
                        <TabsTrigger value="my-plan" className="w-full">
                            <BrainCircuit className="mr-2 h-4 w-4" /> Meu Plano (IA)
                        </TabsTrigger>
                        </TabsList>
                    )}
                    </div>

                    <TabsContent value="pro-plan">
                      <MealPlanView plan={proPlan} />
                    </TabsContent>
                    <TabsContent value="my-plan">
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
                            <div className="xl:order-2">
                                <MealPlanView plan={myPlan} onPlanDelete={handlePlanDelete} />
                            </div>
                            <div className="xl:order-1 space-y-6">
                               <Card>
                                  <CardHeader>
                                    <CardTitle>Assistente de Plano IA</CardTitle>
                                    <CardDescription>Gere ou edite um plano alimentar personalizado com base em suas metas.</CardDescription>
                                  </CardHeader>
                                  <CardContent>
                                    {userProfile && <PlanEditor userProfile={userProfile} onPlanSaved={() => {}} isProfessional={false} />}
                                  </CardContent>
                                </Card>
                                
                                <Collapsible open={isHistoryOpen} onOpenChange={setIsHistoryOpen} className="bg-card rounded-2xl border shadow-sm">
                                    <CollapsibleTrigger className="flex w-full items-center justify-between text-left p-4 hover:bg-secondary/50 rounded-t-2xl data-[state=open]:rounded-b-none">
                                        <div className="flex items-center gap-3">
                                            <History className='h-6 w-6 text-primary flex-shrink-0'/>
                                            <div className="flex-1">
                                                <h3 className='text-lg font-semibold'>Histórico de Planos</h3>
                                                <p className='text-sm text-muted-foreground font-normal'>Veja e restaure seus planos gerados anteriormente.</p>
                                            </div>
                                        </div>
                                        <ChevronsUpDown className={cn("h-5 w-5 transition-transform text-muted-foreground ml-2", isHistoryOpen && 'rotate-180')}/>
                                    </CollapsibleTrigger>
                                  <CollapsibleContent className="pt-4 p-4 border-t">
                                      {planHistory && planHistory.length > 0 ? (
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                              {planHistory.map(plan => (
                                                  <PlanHistoryCard key={plan.id} plan={plan} onRestore={handleRestorePlan} isRestoring={isRestoring} isCurrent={comparePlans(activePlan, plan)} />
                                              ))}
                                          </div>
                                      ) : (
                                          <p className='text-muted-foreground text-center py-4'>Nenhum plano antigo no seu histórico.</p>
                                      )}
                                  </CollapsibleContent>
                              </Collapsible>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
      </div>
    </AppLayout>
  );
}
