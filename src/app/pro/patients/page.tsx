
// src/app/pro/patients/page.tsx
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, PlusCircle, Users, Search } from 'lucide-react';
import type { UserProfile } from '@/types/user';
import type { Room } from '@/types/room';
import AppLayout from '@/components/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import CreateRoomModal from '@/components/pro/create-room-modal';
import RoomCard from '@/components/pro/room-card';
import { useUser, useFirestore } from '@/firebase';
import { collection, query, where, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';

export default function ProPatientsPage() {
  const { user, userProfile, isUserLoading, onProfileUpdate } = useUser();
  const router = useRouter();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
      return;
    }
    if (!isUserLoading && user && userProfile && userProfile.profileType !== 'professional') {
        router.push('/dashboard');
        return;
    }
  }, [user, isUserLoading, userProfile, router]);

  useEffect(() => {
    if (!user || !userProfile || !firestore || userProfile.profileType !== 'professional') {
      setLoading(false);
      return;
    }

    setLoading(true);
    let unsubRooms: Unsubscribe | undefined;

    const roomsRef = collection(firestore, 'rooms');
    const q = query(roomsRef, where('professionalId', '==', user.uid));

    unsubRooms = onSnapshot(q, (snapshot) => {
        const fetchedRooms = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Room));
        setRooms(fetchedRooms);
        setLoading(false);
    }, (error) => {
        console.error("Error fetching rooms:", error);
        toast({ title: 'Erro ao carregar salas', variant: 'destructive' });
        setLoading(false);
    });

    return () => {
      if (unsubRooms) unsubRooms();
    };

  }, [user, userProfile, firestore, toast]);

  const filteredRooms = useMemo(() => {
    if (!rooms) return [];
    return rooms.filter(room =>
      room.roomName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      room.patientInfo.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [rooms, searchTerm]);

  if (isUserLoading || loading || !userProfile) {
    return (
       <AppLayout
        user={user}
        userProfile={userProfile}
        onProfileUpdate={onProfileUpdate}
      >
        <div className="flex w-full h-full flex-col bg-background items-center justify-center">
          <Loader2 className="h-16 w-16 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Carregando pacientes...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
        user={user}
        userProfile={userProfile}
        onProfileUpdate={onProfileUpdate}
    >
       <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-8 animate-fade-in text-center sm:text-left gap-4">
                <div className="flex-1">
                    <h1 className="text-3xl font-bold text-foreground font-heading">Gestão de Pacientes</h1>
                    <p className="text-muted-foreground max-w-2xl mt-2 mx-auto sm:mx-0">Crie salas, adicione pacientes e acompanhe o progresso de cada um.</p>
                </div>
                 <Button onClick={() => setModalOpen(true)} disabled={!user}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Criar Nova Sala
                </Button>
            </div>

            <div className="mb-8 relative max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Buscar por nome do paciente ou sala..."
                  className="w-full rounded-lg bg-background pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

             {filteredRooms.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {user && filteredRooms.map(room => (
                        <RoomCard key={room.id} room={room} professionalId={user.uid} />
                    ))}
                </div>
             ) : (
                <div className="mt-12">
                    <Card className="max-w-2xl mx-auto shadow-sm rounded-2xl animate-fade-in border-dashed" style={{animationDelay: '150ms'}}>
                        <CardHeader className="text-center p-8">
                            <Users className="h-12 w-12 text-primary mx-auto mb-4" />
                            <CardTitle className="text-2xl font-heading">{rooms.length > 0 ? 'Nenhum Paciente Encontrado' : 'Nenhum Paciente Adicionado'}</CardTitle>
                            <CardDescription className="mt-2">
                                {rooms.length > 0 ? 'Tente uma busca diferente.' : 'Clique no botão "Criar Nova Sala" para convidar seu primeiro paciente e iniciar o acompanhamento.'}
                            </CardDescription>
                        </CardHeader>
                    </Card>
                </div>
             )}
       </div>

       {user && (
        <CreateRoomModal 
          isOpen={isModalOpen}
          onOpenChange={setModalOpen}
          professionalId={user.uid}
       />
      )}
    </AppLayout>
  );
}
