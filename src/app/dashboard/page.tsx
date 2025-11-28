
// src/app/dashboard/page.tsx
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { MealEntry } from '@/types/meal';
import type { UserProfile } from '@/types/user';
import type { HydrationEntry } from '@/types/hydration';
import type { WeightLog } from '@/types/weight';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Settings, LayoutDashboard } from 'lucide-react';
import { collection, query, onSnapshot, deleteDoc, updateDoc, setDoc, Unsubscribe, doc, addDoc, serverTimestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { getLocalDateString } from '@/lib/date-utils';
import { useUser, useFirestore } from '@/firebase';
import { verifyAndFinalizeSubscription } from '@/app/actions/billing-actions';

import AppLayout from '@/components/app-layout';
import EditMealModal from '@/components/edit-meal-modal';
import { Button } from '@/components/ui/button';
import WaterTrackerCard from '@/components/water-tracker-card';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import SummaryCards from '@/components/summary-cards';
import ConsumedFoodsList from '@/components/consumed-foods-list';
import GoalsSettingsModal from '@/components/settings-modal';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import InlineAddMealForm from '@/components/inline-add-meal-form';
import { cn } from '@/lib/utils';
import WeightReminderCard from '@/components/weight-reminder-card';


export default function DashboardPage() {
  const db = useFirestore();
  const { user, userProfile, isUserLoading, onProfileUpdate } = useUser();
  const router = useRouter();

  const [mealEntries, setMealEntries] = useState<MealEntry[]>([]);
  const [hydrationEntries, setHydrationEntries] = useState<HydrationEntry[]>([]);
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
  const { toast } = useToast();
  
  const [editingMeal, setEditingMeal] = useState<MealEntry | null>(null);
  const [isGoalsModalOpen, setGoalsModalOpen] = useState(false);
  const [isAddMealFormOpen, setAddMealFormOpen] = useState(false);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    // Client-side check to finalize payment from localStorage
    const finalizePayment = async () => {
        if (user && userProfile?.subscriptionStatus === 'free') {
            const pendingChargeId = localStorage.getItem(`pendingChargeId_${user.uid}`);
            if (pendingChargeId) {
                try {
                    const result = await verifyAndFinalizeSubscription(user.uid, pendingChargeId);
                    if (result.success) {
                        // The userProfile will update via the onSnapshot listener in useUser
                        // Redirect to success page
                        localStorage.removeItem(`pendingChargeId_${user.uid}`);
                        router.push('/checkout/success');
                    } else if (result.message !== 'Pagamento não confirmado ou ainda pendente.') {
                        // Only show error if it's not a pending payment, to avoid annoying the user.
                        toast({ title: "Falha na Finalização", description: result.message, variant: 'destructive' });
                        localStorage.removeItem(`pendingChargeId_${user.uid}`);
                    }
                } catch (err: any) {
                    console.error("Erro ao tentar finalizar assinatura:", err);
                    toast({ title: 'Erro de Verificação', description: err.message, variant: 'destructive' });
                    localStorage.removeItem(`pendingChargeId_${user.uid}`);
                }
            }
        }
    };
    finalizePayment();
  }, [user, userProfile, toast, router]);

  useEffect(() => {
    if (!user || !db) return;

    let unsubMeals: Unsubscribe | undefined;
    let unsubHydration: Unsubscribe | undefined;
    let unsubWeight: Unsubscribe | undefined;

    const baseQuery = (collectionName: string) => query(collection(db, 'users', user.uid, collectionName));
    
    unsubMeals = onSnapshot(baseQuery('meal_entries'), (snapshot) => {
      setMealEntries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MealEntry)));
    }, (error) => {
        console.error("Error fetching meal entries:", error);
        toast({ title: "Erro ao carregar refeições", variant: "destructive" });
    });

    unsubHydration = onSnapshot(baseQuery('hydration_entries'), (snapshot) => {
      setHydrationEntries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as HydrationEntry)));
    }, (error) => {
        console.error("Error fetching hydration entries:", error);
        toast({ title: "Erro ao carregar hidratação", variant: "destructive" });
    });

    unsubWeight = onSnapshot(baseQuery('weight_logs'), (snapshot) => {
      setWeightLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WeightLog)));
    }, (error) => {
        console.error("Error fetching weight logs:", error);
        toast({ title: "Erro ao carregar histórico de peso", variant: "destructive" });
    });

    return () => {
      if (unsubMeals) unsubMeals();
      if (unsubHydration) unsubHydration();
      if (unsubWeight) unsubWeight();
    };

  }, [user, db, toast]);

  const handleMealDeleted = useCallback(async (entryId: string) => {
    if (!db || !user) return;
    try {
        await deleteDoc(doc(db, 'users', user.uid, 'meal_entries', entryId));
        toast({
            title: "Refeição Removida",
            description: "A refeição foi removida do seu histórico.",
        });
    } catch (error) {
        console.error("Error deleting meal:", error);
        toast({
            title: "Erro ao Remover",
            description: "Não foi possível remover a refeição. Tente novamente.",
            variant: "destructive",
        });
    }
  }, [db, toast, user]);

  const handleMealUpdate = useCallback(async (updatedMeal: MealEntry) => {
    if (!db || !updatedMeal.id || !user) return;
    try {
        const mealRef = doc(db, 'users', user.uid, 'meal_entries', updatedMeal.id);
        await updateDoc(mealRef, {
            mealData: updatedMeal.mealData
        });
        toast({
            title: "Refeição Atualizada",
            description: "Os valores da sua refeição foram atualizados.",
        });
        setEditingMeal(null);
    } catch(e) {
        console.error("Error updating meal:", e);
        toast({ title: "Erro", description: "Não foi possível atualizar a refeição.", variant: "destructive" });
    }
  }, [db, toast, user]);

  const handleProfileUpdateWithToast = useCallback(async (updatedProfile: Partial<UserProfile>) => {
    try {
        await onProfileUpdate(updatedProfile);
        toast({
          title: "Perfil Atualizado!",
          description: "Suas informações foram salvas.",
        });
    } catch(e) {
        console.error(e);
        toast({ title: "Erro", description: "Falha ao atualizar o perfil." });
    }
  }, [onProfileUpdate, toast]);
  
  const waterGoal = useMemo(() => userProfile?.waterGoal || 2000, [userProfile]);
  const todayStr = getLocalDateString(new Date());
  const todayHydration = hydrationEntries.find(entry => entry.date === todayStr) || null;

  const handleWaterUpdate = useCallback(async (amount: number) => {
     if (!user || !db) return;
     const currentIntake = todayHydration?.intake || 0;
     const newIntake = Math.max(0, currentIntake + amount);
     
     const dateStr = getLocalDateString();
     const hydrationRef = doc(db, 'users', user.uid, 'hydration_entries', `${user.uid}_${dateStr}`);
     const data = {
        userId: user.uid,
        date: dateStr,
        intake: newIntake,
        goal: waterGoal
     };
     setDoc(hydrationRef, data, { merge: true });
  }, [user, db, waterGoal, todayHydration]);
  
  const hasLoggedWeightToday = useMemo(() => {
    const todayStr = getLocalDateString(new Date());
    return weightLogs.some(log => log.date === todayStr);
  }, [weightLogs]);

  const handleWeightUpdate = useCallback(async (newWeight: number) => {
      if (!user || !db || !newWeight || newWeight <= 0) {
        toast({ title: "Peso inválido", variant: 'destructive' });
        return;
      }

      try {
        // Update user profile
        await onProfileUpdate({ weight: newWeight });

        // Add to weight_logs collection
        const logData = {
          userId: user.uid,
          weight: newWeight,
          date: getLocalDateString(new Date()),
          createdAt: serverTimestamp(),
        }
        await addDoc(collection(db, 'users', user.uid, 'weight_logs'), logData);

        toast({
            title: "Peso Atualizado!",
            description: `Seu peso foi registrado como ${newWeight}kg.`,
        });

      } catch (error) {
        console.error('Error updating weight:', error);
        toast({ title: 'Erro ao salvar peso', variant: 'destructive'});
      }
  }, [user, db, onProfileUpdate, toast]);

  const todayMeals = mealEntries.filter(entry => entry.date === todayStr);

  const totalNutrients = useMemo(() => todayMeals.reduce(
    (acc, meal) => {
        acc.calorias += meal.mealData.totais.calorias;
        acc.proteinas += meal.mealData.totais.proteinas;
        acc.carboidratos += meal.mealData.totais.carboidratos || 0;
        acc.gorduras += meal.mealData.totais.gorduras || 0;
        return acc;
    },
    { calorias: 0, proteinas: 0, carboidratos: 0, gorduras: 0 }
  ), [todayMeals]);

  const nutrientGoals = useMemo(() => ({
    calories: userProfile?.calorieGoal || 2000,
    protein: userProfile?.proteinGoal || 140,
  }), [userProfile]);

  if (isUserLoading || !user) {
    return (
      <div className="flex min-h-screen w-full flex-col bg-background items-center justify-center">
         <Loader2 className="h-16 w-16 animate-spin text-primary" />
         <p className="mt-4 text-muted-foreground">Carregando seu diário...</p>
      </div>
    );
  }
  
  return (
    <AppLayout
        user={user}
        userProfile={userProfile}
        onProfileUpdate={handleProfileUpdateWithToast}
    >
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col gap-8">
            <div className='flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left animate-fade-in'>
                <div className='flex-1'>
                    <h2 className='text-3xl font-bold font-heading flex items-center gap-3'>
                        <LayoutDashboard className='h-8 w-8 text-primary'/>
                        Seu Diário
                    </h2>
                    <p className='text-muted-foreground'>Acompanhe suas refeições, hidratação e veja seu progresso diário.</p>
                </div>
                <div className="flex items-center gap-2 p-1 rounded-lg bg-muted sm:bg-transparent sm:p-0">
                    <Button id="add-meal-button" onClick={() => setAddMealFormOpen(prev => !prev)} variant="ghost" size="sm" className='flex-1 sm:flex-initial'>
                        <Plus className={cn("h-4 w-4 mr-2 transition-transform", isAddMealFormOpen && "rotate-45")} />
                         {isAddMealFormOpen ? "Fechar" : "Adicionar Refeição"}
                    </Button>
                    <Button id="adjust-goals-button" onClick={() => setGoalsModalOpen(true)} variant="outline" size="sm" className='flex-1 sm:flex-initial'>
                        <Settings className="mr-2 h-4 w-4" /> Ajustar Metas
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-2 space-y-8">
                     <Collapsible open={isAddMealFormOpen} onOpenChange={setAddMealFormOpen}>
                        <CollapsibleContent>
                           <Card className="shadow-sm rounded-2xl w-full mb-8">
                             {user && <InlineAddMealForm userId={user.uid} onMealAdded={() => setAddMealFormOpen(false)} />}
                           </Card>
                        </CollapsibleContent>
                     </Collapsible>
                    
                    <Card className="shadow-sm rounded-2xl w-full">
                        <CardHeader>
                            <CardTitle>Refeições de Hoje</CardTitle>
                        </CardHeader>
                        <CardContent>
                           <ConsumedFoodsList 
                              mealEntries={todayMeals} 
                              onMealDeleted={handleMealDeleted}
                              onMealEdit={(meal) => setEditingMeal(meal)}
                            />
                        </CardContent>
                    </Card>
                </div>
                <div className="lg:col-span-1 space-y-8">
                     {!hasLoggedWeightToday && (
                        <WeightReminderCard 
                            currentWeight={userProfile?.weight}
                            onWeightSubmit={handleWeightUpdate}
                        />
                     )}
                     <div id="summary-cards">
                        <SummaryCards
                            totalNutrients={totalNutrients}
                            nutrientGoals={nutrientGoals}
                        />
                    </div>
                    <div id="water-tracker-card">
                      <WaterTrackerCard
                          waterIntake={todayHydration?.intake || 0}
                          waterGoal={waterGoal}
                          onAddWater={() => handleWaterUpdate(250)}
                          onRemoveWater={() => handleWaterUpdate(-250)}
                      />
                    </div>
                </div>
            </div>
        </div>
      </div>
         {editingMeal && (
            <EditMealModal
                isOpen={!!editingMeal}
                onOpenChange={() => setEditingMeal(null)}
                mealEntry={editingMeal}
                onMealUpdate={handleMealUpdate}
            />
        )}
        {user && userProfile &&
          <>
             <GoalsSettingsModal
                isOpen={isGoalsModalOpen}
                onOpenChange={setGoalsModalOpen}
                userProfile={userProfile}
                userId={user.uid}
                onProfileUpdate={onProfileUpdate}
            />
          </>
        }
    </AppLayout>
  );
}
