// src/components/pro/create-room-modal.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { collection, query, where, getDocs, writeBatch, doc, serverTimestamp, arrayUnion } from 'firebase/firestore';
import type { Room, PatientInfo } from '@/types/room';

const formSchema = z.object({
  roomName: z.string().min(3, 'O nome da sala deve ter pelo menos 3 caracteres.'),
  shareCode: z.string().length(8, 'O código de compartilhamento deve ter 8 caracteres.'),
});

type CreateRoomFormValues = z.infer<typeof formSchema>;

interface CreateRoomModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  professionalId: string;
}

export default function CreateRoomModal({ isOpen, onOpenChange, professionalId }: CreateRoomModalProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const form = useForm<CreateRoomFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      roomName: '',
      shareCode: '',
    },
  });

  const { isSubmitting } = form.formState;

  const onSubmit = async (data: CreateRoomFormValues) => {
    if (!firestore) {
        toast({ title: 'Erro de Conexão', description: 'Serviço de banco de dados não disponível. Tente mais tarde.', variant: 'destructive'});
        return;
    }
    try {
        const usersRef = collection(firestore, 'users');
        const patientQuery = query(usersRef, where('dashboardShareCode', '==', data.shareCode.toUpperCase()));
        const patientSnapshot = await getDocs(patientQuery);

        if (patientSnapshot.empty) {
          throw new Error('Código de compartilhamento inválido ou não encontrado. Verifique com o paciente.');
        }

        const patientDoc = patientSnapshot.docs[0];
        const patientId = patientDoc.id;
        const patientData = patientDoc.data();

        if (patientData.patientRoomId) {
          throw new Error('Este paciente já está sendo acompanhado por um profissional.');
        }
        
        const patientInfo: PatientInfo = {
            name: patientData.fullName,
            email: patientData.email,
        };
        if (patientData.age !== undefined) patientInfo.age = patientData.age;
        if (patientData.weight !== undefined) patientInfo.weight = patientData.weight;
        
        const newRoomData: Omit<Room, 'id'> = {
          roomName: data.roomName,
          professionalId: professionalId,
          patientId,
          patientInfo,
          activePlan: {
            calorieGoal: patientData.calorieGoal || 2000,
            proteinGoal: patientData.proteinGoal || 140,
            hydrationGoal: patientData.waterGoal || 2000,
            meals: [],
            createdAt: serverTimestamp() as any,
          },
          planHistory: [],
          createdAt: serverTimestamp() as any,
        };

        const batch = writeBatch(firestore);
        const newRoomRef = doc(collection(firestore, 'rooms'));
        
        batch.set(newRoomRef, newRoomData);

        const professionalRef = doc(firestore, 'users', professionalId);
        batch.update(professionalRef, {
          professionalRoomIds: arrayUnion(newRoomRef.id),
        });

        const patientRef = doc(firestore, 'users', patientId);
        batch.update(patientRef, {
          patientRoomId: newRoomRef.id,
        });

        await batch.commit();

        toast({
            title: "Sala Criada com Sucesso!",
            description: `Você agora está conectado ao paciente ${patientData.fullName}.`,
        });
        form.reset();
        onOpenChange(false);
    } catch (error: any) {
      console.error("Failed to create room:", error);
      toast({
        title: "Erro ao Criar Sala",
        description: error.message || "Não foi possível criar a sala. Verifique o código e tente novamente.",
        variant: "destructive",
      });
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
        <Form {...form}>
          <form id="create-room-form" onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
            <SheetHeader>
              <SheetTitle className="text-2xl font-bold">Adicionar Paciente</SheetTitle>
              <SheetDescription>
                Insira o nome da sala e o código de compartilhamento do paciente.
              </SheetDescription>
            </SheetHeader>
            <div className="flex-1 space-y-6 py-6 px-1">
              <FormField control={form.control} name="roomName" render={({ field }) => (
                  <FormItem>
                      <FormLabel>Nome da Sala *</FormLabel>
                      <FormControl><Input placeholder="Ex: Acompanhamento de Juliana" {...field} /></FormControl>
                      <FormMessage />
                  </FormItem>
              )}/>
              <FormField control={form.control} name="shareCode" render={({ field }) => (
                  <FormItem>
                      <FormLabel>Código de Compartilhamento *</FormLabel>
                      <FormControl><Input placeholder="ABC123XY" {...field} onChange={e => field.onChange(e.target.value.toUpperCase())} /></FormControl>
                      <FormMessage />
                  </FormItem>
              )}/>
            </div>
            <SheetFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" form="create-room-form" disabled={isSubmitting}>
                 {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Criar Sala
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
