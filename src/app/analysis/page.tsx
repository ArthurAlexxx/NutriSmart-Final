
// src/app/analysis/page.tsx
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { MealEntry } from '@/types/meal';
import type { UserProfile } from '@/types/user';
import type { HydrationEntry } from '@/types/hydration';
import type { WeightLog } from '@/types/weight';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Database, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { subDays, eachDayOfInterval, format, startOfDay } from 'date-fns';
import AppLayout from '@/components/app-layout';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getLocalDateString } from '@/lib/date-utils';
import { useUser, useFirestore } from '@/firebase';
import { query, collection, onSnapshot, Unsubscribe } from 'firebase/firestore';
import SummaryCards from '@/components/summary-cards';
import ChartsView from '@/components/analysis/charts-view';
import { seedDemoData, deleteSeededData } from '@/app/actions/seed-data';
import SubscriptionOverlay from '@/components/subscription-overlay';


type Period = 7 | 15 | 30;
const DEMO_USER_ID = 'z9Ru4QiC4Kf5Okf257OruaazvyF2';

export default function AnalysisPage() {
  const { user, isUserLoading, userProfile, onProfileUpdate, effectiveSubscriptionStatus } = useUser();
  const router = useRouter();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [mealEntries, setMealEntries] = useState<MealEntry[]>([]);
  const [hydrationEntries, setHydrationEntries] = useState<HydrationEntry[]>([]);
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>(7);
  const [isSeeding, setIsSeeding] = useState(false);

  const isDemoUser = user?.uid === DEMO_USER_ID;
  const isFeatureLocked = effectiveSubscriptionStatus === 'free';

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  const handleSeedData = async () => {
    setIsSeeding(true);
    const result = await seedDemoData();
    if (result.success) {
      toast({ title: 'Sucesso!', description: result.message });
    } else {
      toast({ title: 'Erro', description: result.message, variant: 'destructive' });
    }
    setIsSeeding(false);
  };

  const handleDeleteData = async () => {
    setIsSeeding(true);
    const result = await deleteSeededData();
    if (result.success) {
      toast({ title: 'Sucesso!', description: result.message });
    } else {
      toast({ title: 'Erro', description: result.message, variant: 'destructive' });
    }
    setIsSeeding(false);
  };


  const handleError = useCallback((error: any, context: string) => {
    console.error(`Error fetching ${context}:`, error);
    toast({
        title: `Erro ao buscar ${context}`,
        description: "Não foi possível carregar os dados. Tente novamente mais tarde.",
        variant: "destructive",
    });
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    if (isUserLoading || !user || !firestore) {
      setLoading(isUserLoading);
      return;
    };

    setLoading(true);

    let unsubMeals: Unsubscribe | undefined;
    let unsubHydration: Unsubscribe | undefined;
    let unsubWeight: Unsubscribe | undefined;

    const baseQuery = (collectionName: string) => query(collection(firestore, 'users', user.uid, collectionName));

    unsubMeals = onSnapshot(baseQuery('meal_entries'), (snapshot) => {
      setMealEntries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MealEntry)));
      setLoading(false);
    }, (error) => handleError(error, 'refeições'));

    unsubHydration = onSnapshot(baseQuery('hydration_entries'), (snapshot) => {
      setHydrationEntries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as HydrationEntry)));
    }, (error) => handleError(error, 'hidratação'));
    
    unsubWeight = onSnapshot(query(collection(firestore, 'users', user.uid, 'weight_logs')), (snapshot) => {
      const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WeightLog));
      setWeightLogs(logs);
    }, (error) => handleError(error, 'peso'));
    

    return () => {
      if (unsubMeals) unsubMeals();
      if (unsubHydration) unsubHydration();
      if (unsubWeight) unsubWeight();
    };
  }, [user, isUserLoading, firestore, handleError]);

  
  const getDateFilteredData = useCallback((entries: {date: string}[], period: number) => {
    const today = startOfDay(new Date());
    const startDate = subDays(today, period - 1);
    const dateIntervalStrings = eachDayOfInterval({ start: startDate, end: today }).map(getLocalDateString);
    const dateSet = new Set(dateIntervalStrings);
    return entries.filter(entry => dateSet.has(entry.date));
  }, []);

  const periodMeals = useMemo(() => getDateFilteredData(mealEntries, period), [mealEntries, period, getDateFilteredData]);
  
   const totalNutrients = useMemo(() => {
     if (periodMeals.length === 0) {
        return { calorias: 0, proteinas: 0, carboidratos: 0, gorduras: 0 };
     }
     const totals = periodMeals.reduce(
        (acc, meal) => {
            acc.calorias += meal.mealData.totais.calorias;
            acc.proteinas += meal.mealData.totais.proteinas;
            acc.carboidratos += meal.mealData.totais.carboidratos;
            acc.gorduras += meal.mealData.totais.gorduras;
            return acc;
        },
        { calorias: 0, proteinas: 0, carboidratos: 0, gorduras: 0 }
     );
     
     const uniqueDays = new Set(periodMeals.map(meal => meal.date)).size;
     if (uniqueDays === 0) return { calorias: 0, proteinas: 0, carboidratos: 0, gorduras: 0 };

     return {
        calorias: totals.calorias / uniqueDays,
        proteinas: totals.proteinas / uniqueDays,
        carboidratos: totals.carboidratos / uniqueDays,
        gorduras: totals.gorduras / uniqueDays,
     };

   }, [periodMeals]);

  const chartData = useMemo(() => {
    const today = startOfDay(new Date());
    const dateInterval = eachDayOfInterval({ start: subDays(today, period - 1), end: today });
    
    return dateInterval.map(day => {
        const dateStr = getLocalDateString(day);
        const dayMeals = mealEntries.filter(entry => entry.date === dateStr);
        const dayCalories = dayMeals.reduce((sum, entry) => sum + entry.mealData.totais.calorias, 0);

        const dayHydration = hydrationEntries.find(entry => entry.date === dateStr);
        const dayIntake = dayHydration?.intake || 0;
        
        const relevantLogs = weightLogs
            .filter(log => new Date(log.date) <= day)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const dayWeight = relevantLogs[0]?.weight || null;

        return {
            day: format(day, 'dd/MM'),
            calories: Math.round(dayCalories),
            intake: dayIntake,
            weight: dayWeight,
        };
    }).reverse();
  }, [mealEntries, hydrationEntries, weightLogs, period]);

  const weightChartData = useMemo(() => {
      let lastKnownWeight: number | null = userProfile?.weight || null;
      const filledData = [...chartData].reverse().map(dataPoint => {
          if (dataPoint.weight !== null) {
              lastKnownWeight = dataPoint.weight;
          }
          return { ...dataPoint, weight: lastKnownWeight };
      });
      return filledData.reverse();
  }, [chartData, userProfile?.weight]);


  const mainContent = () => {
    if (loading || isUserLoading) {
      return (
        <div className="flex min-h-[50vh] w-full flex-col bg-background items-center justify-center">
           <Loader2 className="h-16 w-16 animate-spin text-primary" />
           <p className="mt-4 text-muted-foreground">Carregando suas análises...</p>
        </div>
      );
    }
    
    return (
      <div className="w-full space-y-8 relative">
        {isFeatureLocked && <SubscriptionOverlay />}
        <div className={cn("w-full space-y-6", isFeatureLocked && 'blur-md pointer-events-none')}>
          <SummaryCards
            totalNutrients={totalNutrients}
            nutrientGoals={userProfile ? { calories: userProfile.calorieGoal || 2000, protein: userProfile.proteinGoal || 140 } : undefined}
            isAnalysisPage={true}
          />
          <p className="text-xs text-muted-foreground text-center -mt-2">
            Médias calculadas para o período de {period} dias.
          </p>
        </div>
        <div className={cn(isFeatureLocked && 'blur-md pointer-events-none')}>
            <ChartsView
            caloriesData={chartData}
            hydrationData={chartData}
            weightData={weightChartData}
            />
        </div>
      </div>
    );
  }
  
  return (
    <AppLayout
        user={user}
        userProfile={userProfile}
        onProfileUpdate={onProfileUpdate}
    >
        <div className="w-full flex flex-col gap-8 print-container overflow-x-hidden">
             <div className="flex flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left no-print">
                <div className="animate-fade-in flex-1">
                    <h2 className="text-3xl font-bold text-foreground font-heading">Análise de Desempenho</h2>
                    <p className="text-muted-foreground mt-1">Seu progresso e tendências de consumo.</p>
                </div>
                 <div className='flex w-full flex-col sm:w-auto sm:flex-row items-center gap-2'>
                    <div className="flex items-center gap-1 p-1 rounded-lg bg-muted w-full sm:w-auto">
                        {( [7, 15, 30] as Period[]).map(p => (
                            <Button 
                                key={p} 
                                onClick={() => setPeriod(p)}
                                variant={period === p ? 'primary' : 'ghost'}
                                size="sm"
                                className={cn("rounded-md flex-1 sm:flex-initial", period === p && 'bg-background text-foreground shadow-sm hover:bg-background/90')}
                            >
                                {p}D
                            </Button>
                        ))}
                    </div>
                </div>
            </div>
            
            {isDemoUser && (
                <div className="no-print p-4 border-2 border-dashed rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 bg-secondary/30">
                    <div className="flex items-center gap-3">
                        <Database className="h-5 w-5 text-primary" />
                        <p className="font-semibold text-sm">Painel de Demonstração</p>
                    </div>
                    <div className="flex items-center gap-2">
                         <Button onClick={handleSeedData} disabled={isSeeding} size="sm" variant="outline">
                            {isSeeding ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Gerar Dados Demo'}
                        </Button>
                        <Button onClick={handleDeleteData} disabled={isSeeding} size="sm" variant="destructive">
                            {isSeeding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </Button>
                    </div>
                </div>
            )}
            
            {mainContent()}
        </div>
    </AppLayout>
  );
}
