
// src/app/pro/room/[roomId]/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, onSnapshot, collection, query, where, Unsubscribe, runTransaction, arrayRemove, writeBatch } from 'firebase/firestore';
import type { Room } from '@/types/room';
import type { UserProfile } from '@/types/user';
import type { MealEntry } from '@/types/meal';
import type { HydrationEntry } from '@/types/hydration';

import AppLayout from '@/components/app-layout';
import { Loader2, ArrowLeft, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PlanEditor from '@/components/pro/plan-editor';
import PatientDailyLog from '@/components/pro/patient-daily-log';
import { ChatRoom } from '@/components/chat-room';
import { getLocalDateString } from '@/lib/date-utils';
import { useAuth, useUser, useFirestore } from '@/firebase';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { useToast } from '@/hooks/use-toast';


export default function RoomDetailPage() {
  const { user, userProfile, isUserLoading, onProfileUpdate } = useUser();
  const [room, setRoom] = useState<Room | null>(null);
  const [mealLog, setMealLog] = useState<MealEntry[]>([]);
  const [hydrationLog, setHydrationLog] = useState<HydrationEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const params = useParams();
  const roomId = params.roomId as string;
  const router = useRouter();
  const firestore = useFirestore();
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
    
    let unsubRoom: Unsubscribe | undefined;

    if (userProfile && firestore) {
        if (userProfile.profileType !== 'professional') {
            router.push('/dashboard');
            return;
        }
        
        setLoading(true);
        unsubRoom = onSnapshot(doc(firestore, 'rooms', roomId), (doc) => {
            if (doc.exists()) {
                setRoom({ id: doc.id, ...doc.data() } as Room);
            } else {
                toast({ title: 'Sala não encontrada', description: 'Esta sala pode ter sido removida.', variant: 'destructive' });
                router.push('/pro/patients');
            }
            setLoading(false);
        }, (error) => {
            console.error("Error fetching room:", error);
            toast({ title: 'Erro ao carregar a sala', description: 'Não foi possível buscar os dados da sala.', variant: 'destructive' });
            router.push('/pro/patients');
        });
    } else if (!isUserLoading) {
        setLoading(false);
    }

    return () => {
        if (unsubRoom) unsubRoom();
    };

  }, [user, userProfile, isUserLoading, roomId, router, firestore, toast]);

   useEffect(() => {
    if (!room?.patientId || !firestore) return;

    const dateStr = getLocalDateString(selectedDate);
    let unsubMeals: Unsubscribe | undefined;
    let unsubHydration: Unsubscribe | undefined;

    // Listener for meal entries for the selected date
    const mealsQuery = query(
      collection(firestore, 'users', room.patientId, 'meal_entries'),
      where('date', '==', dateStr)
    );
    unsubMeals = onSnapshot(mealsQuery, (snapshot) => {
      const entries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MealEntry));
      setMealLog(entries);
    }, (error) => {
        console.error("Error fetching patient meal log:", error);
        toast({ title: 'Erro ao carregar refeições do paciente', variant: 'destructive' });
    });

    // Listener for hydration entry for the selected date
    const hydrationRef = doc(firestore, 'users', room.patientId, 'hydration_entries', `${room.patientId}_${dateStr}`);
    unsubHydration = onSnapshot(hydrationRef, (doc) => {
      if (doc.exists()) {
        setHydrationLog({ id: doc.id, ...doc.data() } as HydrationEntry);
      } else {
        setHydrationLog(null);
      }
    }, (error) => {
        console.error("Error fetching patient hydration log:", error);
        toast({ title: 'Erro ao carregar hidratação do paciente', variant: 'destructive' });
    });

    return () => {
      if (unsubMeals) unsubMeals();
      if (unsubHydration) unsubHydration();
    };
  }, [room?.patientId, selectedDate, firestore, toast]);

  const handleDeleteRoom = async () => {
    setIsDeleting(true);
    if (!firestore || !room || !user) {
        toast({ title: 'Erro', description: 'Dados insuficientes para remover a sala.', variant: 'destructive' });
        setIsDeleting(false);
        return;
    }
    try {
      const batch = writeBatch(firestore);
      const roomRef = doc(firestore, 'rooms', room.id);
      const professionalUserRef = doc(firestore, 'users', user.uid);
      const patientUserRef = doc(firestore, 'users', room.patientId);

      // 1. Delete the room document
      batch.delete(roomRef);
      
      // 2. Remove the room ID from the professional's room list
      batch.update(professionalUserRef, {
        professionalRoomIds: arrayRemove(room.id),
      });

      // 3. Update the patient's user document
      batch.update(patientUserRef, {
        patientRoomId: null,
      });

      await batch.commit();
      
      toast({
        title: 'Sala Removida',
        description: `A sala para ${room.patientInfo.name} foi removida com sucesso.`,
      });
      router.push('/pro/patients');

    } catch (error: any) {
      toast({
        title: 'Erro ao Remover',
        description: error.message || 'Não foi possível remover a sala. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  
  if (loading || isUserLoading) {
    return (
      <div className="flex min-h-screen w-full flex-col bg-background items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Carregando dados da sala...</p>
      </div>
    );
  }
  
  return (
    <AppLayout
      user={user}
      userProfile={userProfile}
      onProfileUpdate={onProfileUpdate}
    >
      <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 flex flex-col h-full">
        <div className="flex items-center justify-between gap-4 mb-8 animate-fade-in">
          <div className='flex items-center gap-4'>
            <Button asChild variant="outline" size="icon">
              <Link href="/pro/patients"><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
            <div>
              <h1 className="text-xl sm:text-3xl font-bold text-foreground font-heading">{room?.roomName}</h1>
              <p className="text-muted-foreground text-sm sm:text-base">Acompanhamento de {room?.patientInfo.name}</p>
            </div>
          </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="shrink-0" disabled={isDeleting}>
                      <Trash2 className="mr-2 h-4 w-4" /> 
                      <span className="hidden sm:inline">Excluir Sala</span>
                  </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                  <AlertDialogHeader>
                  <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                  <AlertDialogDescription>
                      Esta ação não pode ser desfeita. Isso removerá permanentemente a sala de acompanhamento de <span className='font-bold'>{room?.patientInfo.name}</span> e o paciente perderá o acesso ao plano alimentar.
                  </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteRoom} disabled={isDeleting} className='bg-destructive hover:bg-destructive/90'>
                      {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Confirmar Remoção'}
                  </AlertDialogAction>
                  </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
        </div>

        <Tabs defaultValue="log" className="w-full flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-3 sm:grid-cols-3 mb-8">
                <TabsTrigger value="log">Registros Diários</TabsTrigger>
                <TabsTrigger value="plan">Editar Plano</TabsTrigger>
                <TabsTrigger value="chat">Chat</TabsTrigger>
            </TabsList>
            
            <TabsContent value="log">
                <PatientDailyLog
                    selectedDate={selectedDate}
                    onDateChange={setSelectedDate}
                    mealLog={mealLog}
                    hydrationLog={hydrationLog}
                    patientId={room?.patientId || null}
                />
            </TabsContent>
            <TabsContent value="plan">
                {room && userProfile && <PlanEditor room={room} userProfile={userProfile} />}
            </TabsContent>
             <TabsContent value="chat" className="flex-1 flex flex-col min-h-0">
                 {room && user && userProfile && <ChatRoom 
                    roomId={room.id}
                    currentUser={{
                      uid: user.uid,
                      name: userProfile?.fullName || 'Profissional',
                    }}
                    isProfessional={true}
                 />}
            </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
