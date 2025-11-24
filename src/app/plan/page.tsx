
// src/app/plan/page.tsx
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { doc, onSnapshot, Unsubscribe, collection, query, where, deleteDoc, orderBy, setDoc, addDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/app-layout';
import { Loader2, BookCopy, BrainCircuit, ChevronsUpDown, History, BookUp } from 'lucide-react';
import type { UserProfile } from '@/types/user';
import type { ActivePlan } from '@/types/plan';
import type { Room } from '@/types/room';
import PlanEditor from '@/components/pro/plan-editor';
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

const PlanHistoryCard = ({ plan, onRestore }: { plan: ActivePlan; onRestore: (plan: ActivePlan) => void; }) => {
    return (
        <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader>
                <CardTitle className="text-lg">{plan.name || 'Plano Antigo'}</CardTitle>
                <CardDescription>
                    Criado em: {plan.createdAt ? format(plan.createdAt.toDate(), 'dd/MM/yyyy HH:mm') : 'Data desconhecida'}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Button onClick={() => onRestore(plan)} className="w-full">
                    <BookUp className="mr-2 h-4 w-4" /> Restaurar este Plano
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
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  
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
    if (!activePlanRef) {
        toast({ title: "Erro", description: "Referência do plano não encontrada.", variant: "destructive" });
        return;
    }
    try {
        await deleteDoc(activePlanRef);
        toast({ title: "Plano Removido", description: "Seu plano alimentar ativo foi removido com sucesso." });
    } catch (error) {
        console.error("Error deleting plan:", error);
        toast({ title: "Erro ao Remover", description: "Não foi possível remover o plano.", variant: "destructive" });
    }
  }, [activePlanRef, toast]);

  const handleRestorePlan = useCallback(async (planToRestore: ActivePlan) => {
      if (!firestore || !user || !activePlanRef) return;
      try {
          // Archive the current active plan before restoring
          if (activePlan) {
              const historyRef = collection(firestore, 'users', user.uid, 'plan_history');
              await addDoc(historyRef, activePlan);
          }
          
          // Set the selected plan as the new active plan
          await setDoc(activePlanRef, planToRestore);

          toast({
              title: "Plano Restaurado!",
              description: `O plano "${planToRestore.name || 'Plano Antigo'}" agora está ativo.`,
          });
      } catch (error) {
          console.error("Error restoring plan:", error);
          toast({ title: "Erro ao Restaurar", description: "Não foi possível restaurar o plano.", variant: "destructive" });
      }

  }, [firestore, user, activePlan, activePlanRef, toast]);

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

  return (
    <AppLayout
        user={user}
        userProfile={userProfile}
        onProfileUpdate={onProfileUpdate}
    >
        <div className="relative">
            {isFeatureLocked && <SubscriptionOverlay />}
            <div className={cn(isFeatureLocked && 'blur-md pointer-events-none')}>
                <Tabs defaultValue={isUnderProfessionalCare ? "pro-plan" : "my-plan"} className="w-full">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8 animate-fade-in">
                    <div className="flex-1 text-center sm:text-left">
                        <h2 className='text-3xl font-bold text-foreground font-heading'>
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
                        <TabsTrigger value="pro-plan">
                            <BookCopy className="mr-2 h-4 w-4" /> Plano do Nutri
                        </TabsTrigger>
                        <TabsTrigger value="my-plan">
                            <BrainCircuit className="mr-2 h-4 w-4" /> Meu Plano (IA)
                        </TabsTrigger>
                        </TabsList>
                    )}
                    </div>

                    <TabsContent value="pro-plan">
                    <MealPlanView plan={proPlan} />
                    </TabsContent>
                    <TabsContent value="my-plan" className="flex flex-col gap-8">
                        <Collapsible open={isEditorOpen} onOpenChange={setIsEditorOpen}>
                        <CollapsibleTrigger asChild>
                            <Button variant="outline" className="w-full justify-between shadow-sm">
                            <span>{isEditorOpen ? 'Fechar Assistente de IA' : 'Gerar ou Editar Plano com IA'}</span>
                            <ChevronsUpDown className={cn("h-4 w-4 transition-transform", isEditorOpen && 'rotate-180')}/>
                            </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="pt-8">
                            {userProfile && <PlanEditor userProfile={userProfile} onPlanSaved={() => setIsEditorOpen(false)} isProfessional={false} />}
                        </CollapsibleContent>
                        </Collapsible>
                        
                        <MealPlanView plan={myPlan} onPlanDelete={handlePlanDelete} />

                        <div className='mt-8'>
                            <h3 className='text-2xl font-bold text-foreground mb-4 flex items-center gap-2 font-heading'><History className='h-6 w-6 text-primary'/> Histórico de Planos</h3>
                             {planHistory && planHistory.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {planHistory.map(plan => (
                                        <PlanHistoryCard key={plan.id} plan={plan} onRestore={handleRestorePlan} />
                                    ))}
                                </div>
                            ) : (
                                <p className='text-muted-foreground'>Nenhum plano antigo no seu histórico.</p>
                            )}
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    </AppLayout>
  );
}
