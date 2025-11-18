// src/app/history/page.tsx
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { collection, query, where, onSnapshot, doc, deleteDoc, Unsubscribe } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

import ConsumedFoodsList from '@/components/consumed-foods-list';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import SummaryCards from '@/components/summary-cards';
import AppLayout from '@/components/app-layout';
import WaterIntakeSummary from '@/components/water-intake-summary';
import HistoryKanbanCalendar from '@/components/history-kanban-calendar';

import type { MealEntry } from '@/types/meal';
import type { UserProfile } from '@/types/user';
import type { HydrationEntry } from '@/types/hydration';
import { getLocalDateString } from '@/lib/date-utils';
import { useUser, useFirestore } from '@/firebase';


export default function HistoryPage() {
  const { user, isUserLoading, userProfile, onProfileUpdate } = useUser();
  const router = useRouter();
  const firestore = useFirestore();

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [allMealEntries, setAllMealEntries] = useState<MealEntry[]>([]);
  const [allHydrationEntries, setAllHydrationEntries] = useState<HydrationEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  
  useEffect(() => {
    if (isUserLoading) {
      setLoading(true);
      return;
    }
    if (!user) {
      router.push('/login');
      return;
    }

    setLoading(false);

    let unsubMeals: Unsubscribe | undefined;
    let unsubHydration: Unsubscribe | undefined;

    if (firestore) {
      const mealsQuery = query(collection(firestore, 'users', user.uid, 'meal_entries'));
      unsubMeals = onSnapshot(mealsQuery, (snapshot) => {
        setAllMealEntries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MealEntry)));
      }, (error) => {
        console.error("Error fetching meal entries for history:", error);
        toast({ title: "Erro ao carregar histórico de refeições", variant: "destructive" });
      });

      const hydrationQuery = query(collection(firestore, 'users', user.uid, 'hydration_entries'));
      unsubHydration = onSnapshot(hydrationQuery, (snapshot) => {
        setAllHydrationEntries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as HydrationEntry)));
      }, (error) => {
        console.error("Error fetching hydration entries for history:", error);
        toast({ title: "Erro ao carregar histórico de hidratação", variant: "destructive" });
      });
    }

    return () => {
      if (unsubMeals) unsubMeals();
      if (unsubHydration) unsubHydration();
    };

  }, [user, isUserLoading, router, firestore, toast]);
  
  const dailyData = useMemo(() => {
    const dateStr = getLocalDateString(selectedDate);
    const meals = allMealEntries.filter(e => e.date === dateStr);
    const hydration = allHydrationEntries.find(e => e.date === dateStr) || null;
    const totals = meals.reduce(
        (acc, entry) => {
            acc.calorias += entry.mealData.totais.calorias;
            acc.proteinas += entry.mealData.totais.proteinas;
            acc.carboidratos += entry.mealData.totais.carboidratos || 0;
            acc.gorduras += entry.mealData.totais.gorduras || 0;
            return acc;
        },
        { calorias: 0, proteinas: 0, carboidratos: 0, gorduras: 0 }
    );
    return {
      mealEntries: meals,
      hydrationEntry: hydration,
      totalNutrients: totals,
    };
  }, [selectedDate, allMealEntries, allHydrationEntries]);


  const handleProfileUpdateWithToast = useCallback(async (updatedProfile: Partial<UserProfile>) => {
    await onProfileUpdate(updatedProfile);
    toast({ title: "Perfil Atualizado", description: "Suas informações foram salvas." });
  }, [onProfileUpdate, toast]);

  const handleMealDeleted = useCallback(async (entryId: string) => {
    if (!firestore || !user) return;
    try {
        await deleteDoc(doc(firestore, 'users', user.uid, 'meal_entries', entryId));
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
  }, [firestore, toast, user]);


  if (loading || isUserLoading) {
    return (
       <AppLayout user={user} userProfile={userProfile} onProfileUpdate={() => {}}>
         <div className="flex min-h-screen w-full flex-col bg-gray-50 items-center justify-center">
           <Loader2 className="h-16 w-16 animate-spin text-primary" />
           <p className="mt-4 text-muted-foreground">Carregando dados...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
        user={user}
        userProfile={userProfile}
        onProfileUpdate={handleProfileUpdateWithToast}
    >
        <div className="flex flex-col gap-8">
            <div className="mb-2 animate-fade-in text-center">
                <h2 className="text-3xl font-bold text-foreground font-heading">Histórico Nutricional</h2>
                <p className="text-muted-foreground">Navegue pelos dias para ver o detalhe de suas refeições.</p>
            </div>
            
            <HistoryKanbanCalendar
              selectedDate={selectedDate}
              onDateSelect={setSelectedDate}
            />

            {(loading || isUserLoading) && allMealEntries.length === 0 ? (
                <div className="flex items-center justify-center h-64 rounded-xl bg-secondary/30">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    <div className="lg:col-span-2 space-y-8">
                       <Card className="shadow-sm rounded-2xl">
                          <CardContent className="p-4">
                               <ConsumedFoodsList 
                                  mealEntries={dailyData.mealEntries} 
                                  onMealDeleted={handleMealDeleted}
                                  onMealEdit={() => {}}
                              />
                          </CardContent>
                       </Card>
                    </div>

                    <div className="lg:col-span-1 space-y-8">
                      <SummaryCards totalNutrients={dailyData.totalNutrients} />
                      <WaterIntakeSummary hydrationEntry={dailyData.hydrationEntry} />
                    </div>
                </div>
             )}
        </div>
    </AppLayout>
  );
}
