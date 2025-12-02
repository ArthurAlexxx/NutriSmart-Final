// src/app/history/page.tsx
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { collection, query, where, onSnapshot, doc, deleteDoc, Unsubscribe, orderBy } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import ConsumedFoodsList from '@/components/consumed-foods-list';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, History as HistoryIcon } from 'lucide-react';
import SummaryCards from '@/components/summary-cards';
import AppLayout from '@/components/app-layout';
import WaterIntakeSummary from '@/components/water-intake-summary';
import HistoryKanbanCalendar from '@/components/history-kanban-calendar';

import type { MealEntry } from '@/types/meal';
import type { UserProfile } from '@/types/user';
import type { HydrationEntry } from '@/types/hydration';
import { getLocalDateString } from '@/lib/date-utils';
import { useUser, useFirestore } from '@/firebase';
import { PageHeader } from '@/components/page-header';

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
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    if (!user || !firestore) {
      setLoading(false);
      return;
    }

    setLoading(true);

    let unsubMeals: Unsubscribe | undefined;
    let unsubHydration: Unsubscribe | undefined;

    const mealsQuery = query(collection(firestore, 'users', user.uid, 'meal_entries'), orderBy('createdAt', 'desc'));
    unsubMeals = onSnapshot(mealsQuery, (snapshot) => {
      setAllMealEntries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MealEntry)));
      setLoading(false);
    }, (error) => {
      console.error("Error fetching meal entries for history:", error);
      toast({ title: "Erro ao carregar histórico de refeições", variant: "destructive" });
      setLoading(false);
    });

    const hydrationQuery = query(collection(firestore, 'users', user.uid, 'hydration_entries'));
    unsubHydration = onSnapshot(hydrationQuery, (snapshot) => {
      setAllHydrationEntries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as HydrationEntry)));
    }, (error) => {
      console.error("Error fetching hydration entries for history:", error);
      toast({ title: "Erro ao carregar histórico de hidratação", variant: "destructive" });
    });

    return () => {
      if (unsubMeals) unsubMeals();
      if (unsubHydration) unsubHydration();
    };

  }, [user, firestore, toast]);
  
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


  if (loading || isUserLoading || !user) {
    return (
       <AppLayout user={user} userProfile={userProfile} onProfileUpdate={() => {}}>
         <div className="flex min-h-[50vh] w-full flex-col items-center justify-center">
           <Loader2 className="h-12 w-12 animate-spin text-primary" />
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
      <div className="w-full flex flex-col items-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-7xl space-y-6 sm:space-y-8 pb-16 sm:pb-8">
            <PageHeader 
                icon={HistoryIcon}
                title="Histórico Nutricional"
                description="Navegue pelos dias para ver o detalhe de suas refeições."
            />
                
            <Card className="shadow-lg rounded-2xl border-border/50 overflow-hidden animate-in fade-in-50 duration-500 delay-100">
                <CardHeader className="bg-gradient-to-br from-secondary/30 to-transparent">
                    <CardTitle>Selecione um Dia</CardTitle>
                    <CardDescription>Use o calendário para navegar pelo seu histórico.</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                    <HistoryKanbanCalendar
                        selectedDate={selectedDate}
                        onDateSelect={setSelectedDate}
                    />
                </CardContent>
            </Card>

            {(loading) && allMealEntries.length === 0 ? (
                <div className="flex items-center justify-center h-64 rounded-xl bg-secondary/30">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
                    <div className="lg:col-span-8 space-y-6 sm:space-y-8">
                        <Card className="shadow-lg rounded-2xl border-border/50 overflow-hidden animate-in fade-in-50 duration-500 delay-200">
                            <CardHeader className="bg-gradient-to-br from-secondary/30 to-transparent">
                                <CardTitle>Refeições de {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}</CardTitle>
                                <CardDescription>
                                    {dailyData.mealEntries.length} {dailyData.mealEntries.length === 1 ? 'refeição registrada' : 'refeições registradas'} neste dia.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-4 sm:p-6">
                                <ConsumedFoodsList 
                                    mealEntries={dailyData.mealEntries} 
                                    onMealDeleted={handleMealDeleted}
                                    onMealEdit={() => {}}
                                />
                            </CardContent>
                        </Card>
                    </div>

                    <div className="lg:col-span-4 space-y-6 sm:space-y-8 lg:sticky lg:top-24">
                        <div className="animate-in fade-in-50 duration-500 delay-300">
                        <SummaryCards totalNutrients={dailyData.totalNutrients} />
                        </div>
                        <div className="animate-in fade-in-50 duration-500 delay-400">
                        <WaterIntakeSummary hydrationEntry={dailyData.hydrationEntry} />
                        </div>
                    </div>
                </div>
                )}
        </div>
      </div>
    </AppLayout>
  );
}
