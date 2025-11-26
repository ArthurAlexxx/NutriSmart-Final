// src/app/analysis/page.tsx
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { MealEntry } from '@/types/meal';
import type { UserProfile } from '@/types/user';
import type { HydrationEntry } from '@/types/hydration';
import type { WeightLog } from '@/types/weight';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Database, Trash2, Lightbulb, BrainCircuit, Calendar, Settings, BarChart3, TrendingUp, Users } from 'lucide-react';
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
import InsightsCard from '@/components/analysis/insights-card';
import { generateAnalysisInsightsAction } from '@/app/actions/ai-actions';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/page-header';


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
  const [insights, setInsights] = useState<string[]>([]);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);

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

  const handleGenerateInsights = async () => {
    if (!userProfile || isFeatureLocked) {
      toast({ title: 'Acesso Negado', description: 'Faça upgrade para o Premium para usar os insights de IA.', variant: 'destructive'});
      return;
    }
    if (periodMeals.length === 0) {
      toast({ title: 'Dados Insuficientes', description: 'Registre algumas refeições no período selecionado antes de gerar insights.'});
      return;
    }
    
    setIsGeneratingInsights(true);
    setInsights([]);
    try {
      const result = await generateAnalysisInsightsAction({
        period,
        goals: {
          calories: userProfile.calorieGoal || 2000,
          protein: userProfile.proteinGoal || 140,
        },
        meals: periodMeals.map(m => ({ // Sanitize data for the action
            date: m.date,
            mealType: m.mealType,
            mealData: {
                totais: {
                    calorias: m.mealData.totais.calorias,
                    proteinas: m.mealData.totais.proteinas,
                }
            }
        })),
      });
      
      setInsights(result.insights);

    } catch (error: any) {
      console.error("Failed to generate insights:", error);
      toast({
        title: 'Erro ao Gerar Insights',
        description: error.message || 'Não foi possível se comunicar com a IA. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingInsights(false);
    }
  };


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
      <div className="w-full space-y-6 sm:space-y-8 relative">
        {isFeatureLocked && <SubscriptionOverlay />}
        <div className={cn("w-full space-y-6 sm:space-y-8", isFeatureLocked && 'blur-md pointer-events-none')}>
          <div className="w-full space-y-6">
            <SummaryCards
              totalNutrients={totalNutrients}
              nutrientGoals={userProfile ? { calories: userProfile.calorieGoal || 2000, protein: userProfile.proteinGoal || 140 } : undefined}
              isAnalysisPage={true}
            />
            <p className="text-xs text-muted-foreground text-center -mt-2">
              Médias calculadas para o período de {period} dias.
            </p>
          </div>
          
           <Card className="shadow-md rounded-2xl border-border/50 overflow-hidden">
                <CardHeader className="bg-gradient-to-br from-secondary/30 to-transparent">
                    <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
                        <div className="flex-1 text-center sm:text-left">
                            <CardTitle className="text-xl font-bold flex items-center gap-2">
                                <Settings className="h-5 w-5 text-primary" />
                                Opções de Visualização
                            </CardTitle>
                        </div>
                        <div className="flex items-center gap-2 p-1.5 rounded-xl bg-secondary/50 border border-border/50 w-full sm:w-auto">
                            {( [7, 15, 30] as Period[]).map(p => (
                                <Button 
                                    key={p} 
                                    onClick={() => setPeriod(p)}
                                    variant={period === p ? 'default' : 'ghost'}
                                    size="sm"
                                    className={cn("rounded-lg flex-1 sm:flex-initial transition-all duration-200", period === p && 'shadow-sm')}
                                >
                                    <Calendar className="mr-2 h-4 w-4" /> {p} Dias
                                </Button>
                            ))}
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="pt-6">
                     <Button onClick={handleGenerateInsights} disabled={isGeneratingInsights || isFeatureLocked} className="w-full sm:w-auto bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70">
                        {isGeneratingInsights ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Lightbulb className="mr-2 h-4 w-4" />
                        )}
                        Gerar Insights com IA
                    </Button>
                </CardContent>
           </Card>

            <InsightsCard insights={insights} isLoading={isGeneratingInsights} />
            
            <div className={cn(isFeatureLocked && 'blur-md pointer-events-none')}>
              <ChartsView
                caloriesData={chartData}
                hydrationData={chartData}
                weightData={weightChartData}
              />
            </div>
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
        <div className="p-4 sm:p-6 lg:p-8 w-full flex flex-col gap-8 print-container overflow-x-hidden">
             <PageHeader 
                icon={TrendingUp}
                title="Análise de Desempenho"
                description="Seu progresso e tendências de consumo ao longo do tempo."
             />
            
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
