
// src/app/plan/page.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { doc, onSnapshot, Unsubscribe, collection, query, where } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/app-layout';
import { Loader2, BookCopy, BrainCircuit } from 'lucide-react';
import type { UserProfile, ActivePlan } from '@/types/user';
import type { Room } from '@/types/room';
import PlanEditor from '@/components/pro/plan-editor';
import MealPlanView from '@/components/meal-plan-view';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from '@/hooks/use-toast';

export default function PlanPage() {
  const { user, userProfile, isUserLoading, onProfileUpdate } = useUser();
  const router = useRouter();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [room, setRoom] = useState<Room | null>(null);
  
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
    // Combine loading states
    const isOverallLoading = isUserLoading || isPlanLoading;
    setLoading(isOverallLoading);

    // Fetch room data only if the user is under professional care
    let unsubRoom: Unsubscribe | undefined;
    if (!isOverallLoading && userProfile?.patientRoomId && firestore) {
      const roomRef = doc(firestore, 'rooms', userProfile.patientRoomId);
      unsubRoom = onSnapshot(roomRef, (doc) => {
        if (doc.exists()) {
          setRoom({ id: doc.id, ...doc.data() } as Room);
        } else {
          setRoom(null);
        }
      }, (error) => {
        console.error("Error fetching room data:", error);
        toast({ title: "Erro ao carregar plano", description: "Não foi possível buscar os dados do seu nutricionista.", variant: "destructive" });
      });
    }

    return () => {
      if (unsubRoom) unsubRoom();
    };

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
                      : "Use nosso assistente de IA para gerar um plano alimentar sob medida ou veja seu plano ativo."
                  }
              </p>
          </div>
          <TabsList className="grid w-full sm:w-auto grid-cols-2">
            <TabsTrigger value="pro-plan" disabled={!isUnderProfessionalCare}>
              <BookCopy className="mr-2 h-4 w-4" /> Plano do Nutri
            </TabsTrigger>
            <TabsTrigger value="my-plan">
              <BrainCircuit className="mr-2 h-4 w-4" /> Meu Plano (IA)
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="pro-plan">
          {/* Always pass the professional's plan to this view */}
          <MealPlanView plan={proPlan} />
        </TabsContent>
        <TabsContent value="my-plan" className="flex flex-col gap-8">
            {userProfile && <PlanEditor userProfile={userProfile} activePlan={myPlan} />}
            <MealPlanView plan={myPlan} />
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
