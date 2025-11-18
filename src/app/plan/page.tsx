
// src/app/plan/page.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { doc, onSnapshot, Unsubscribe, collection, query, where } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/app-layout';
import { Loader2, BookCopy, BrainCircuit, ChevronsUpDown } from 'lucide-react';
import type { UserProfile, ActivePlan } from '@/types/user';
import type { Room } from '@/types/room';
import PlanEditor from '@/components/pro/plan-editor';
import MealPlanView from '@/components/meal-plan-view';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from '@/hooks/use-toast';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function PlanPage() {
  const { user, userProfile, isUserLoading, onProfileUpdate } = useUser();
  const router = useRouter();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [room, setRoom] = useState<Room | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  
  const isUnderProfessionalCare = !!userProfile?.patientRoomId;

  // Hook to fetch the user's active plan from the subcollection
  const activePlanRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid, 'plans', 'active');
  }, [user, firestore]);
  const { data: activePlan, isLoading: isPlanLoading } = useDoc<ActivePlan>(activePlanRef);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    // Open editor by default if there's no plan
    if (!isPlanLoading && !activePlan) {
      setIsEditorOpen(true);
    }
  }, [isPlanLoading, activePlan]);


  useEffect(() => {
    const isOverallLoading = isUserLoading || isPlanLoading;

    if (!isOverallLoading && userProfile?.patientRoomId && firestore) {
      const roomRef = doc(firestore, 'rooms', userProfile.patientRoomId);
      const unsubRoom = onSnapshot(roomRef, (doc) => {
        if (doc.exists()) {
          setRoom({ id: doc.id, ...doc.data() } as Room);
        } else {
          setRoom(null);
        }
        setLoading(false); // End loading after fetching room data
      }, (error) => {
        console.error("Error fetching room data:", error);
        toast({ title: "Erro ao carregar plano", description: "Não foi possível buscar os dados do seu nutricionista.", variant: "destructive" });
        setLoading(false);
      });
      return () => unsubRoom();
    } else {
      setLoading(isOverallLoading);
    }
  }, [user, isUserLoading, isPlanLoading, userProfile, firestore, toast]);
  

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
  
  // Determine which plan to display in the "Pro Plan" tab
  const proPlan = room?.activePlan;
  // The user's personal plan is always `activePlan` from the subcollection
  const myPlan = activePlan;

  return (
    <AppLayout
        user={user}
        userProfile={userProfile}
        onProfileUpdate={onProfileUpdate}
    >
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
          {/* Always pass the professional's plan to this view */}
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
                  {userProfile && <PlanEditor userProfile={userProfile} activePlan={myPlan} onPlanSaved={() => setIsEditorOpen(false)} />}
              </CollapsibleContent>
            </Collapsible>
            
            <MealPlanView plan={myPlan} />
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
