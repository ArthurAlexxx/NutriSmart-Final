
// src/components/goals-settings-modal.tsx
'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Save, Target, Weight, CalendarIcon, Flame, Droplet, Rocket } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { type UserProfile } from '@/types/user';
import { cn } from '@/lib/utils';
import { doc, updateDoc, collection, serverTimestamp, Timestamp, writeBatch } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import { getLocalDateString } from '@/lib/date-utils';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';

const formSchema = z.object({
  weight: z.coerce.number().min(1, 'O peso deve ser maior que 0.').optional().or(z.literal(NaN)),
  targetWeight: z.coerce.number().min(1, 'A meta de peso deve ser maior que 0.').optional().or(z.literal(NaN)),
  targetDate: z.date().optional(),
  calorieGoal: z.coerce.number().min(1, 'A meta de calorias deve ser maior que 0.'),
  proteinGoal: z.coerce.number().min(1, 'A meta de proteínas deve ser maior que 0.'),
  waterGoal: z.coerce.number().min(1, 'A meta de água deve ser maior que 0.'),
});

type GoalsFormValues = z.infer<typeof formSchema>;

interface GoalsSettingsModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  userProfile: UserProfile;
  userId: string;
  onProfileUpdate: (updatedProfile: Partial<UserProfile>) => void;
}

export default function GoalsSettingsModal({ isOpen, onOpenChange, userProfile, userId, onProfileUpdate }: GoalsSettingsModalProps) {
  const { toast } = useToast();
  const firestore = useFirestore();

  const form = useForm<GoalsFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      calorieGoal: 2000,
      proteinGoal: 140,
      waterGoal: 2000,
      weight: NaN,
      targetWeight: NaN,
      targetDate: undefined,
    },
  });
  
  const { isSubmitting, isDirty } = form.formState;

  useEffect(() => {
    if (isOpen && userProfile) {
      const targetDate = userProfile.targetDate;
      let finalDate: Date | undefined;
      if (targetDate) {
        if (typeof (targetDate as any)?.toDate === 'function') {
            finalDate = (targetDate as Timestamp).toDate();
        } else if (targetDate instanceof Date) {
            finalDate = targetDate;
        }
      }

      form.reset({
        calorieGoal: userProfile.calorieGoal ?? 2000,
        proteinGoal: userProfile.proteinGoal ?? 140,
        waterGoal: userProfile.waterGoal ?? 2000,
        weight: userProfile.weight ?? NaN,
        targetWeight: userProfile.targetWeight ?? NaN,
        targetDate: finalDate,
      });
    }
  }, [userProfile, form, isOpen]);
  
  const watchedCalorieGoal = form.watch('calorieGoal');

  useEffect(() => {
      if (watchedCalorieGoal > 0 && form.formState.dirtyFields.calorieGoal) {
          const newProteinGoal = Math.round((watchedCalorieGoal * 0.35) / 4);
          form.setValue('proteinGoal', newProteinGoal, { shouldDirty: true });
      }
  }, [watchedCalorieGoal, form]);

  const onSubmit = async (data: GoalsFormValues) => {
    if (!firestore || !isDirty) {
        onOpenChange(false);
        return;
    }

    try {
        const batch = writeBatch(firestore);
        const userRef = doc(firestore, 'users', userId);
        const updatedProfile: Partial<UserProfile> = {};
        const dirtyFields = form.formState.dirtyFields;

        if (dirtyFields.calorieGoal) updatedProfile.calorieGoal = data.calorieGoal;
        if (dirtyFields.proteinGoal) updatedProfile.proteinGoal = data.proteinGoal;
        if (dirtyFields.waterGoal) updatedProfile.waterGoal = data.waterGoal;
        if (dirtyFields.weight && data.weight && !isNaN(data.weight)) updatedProfile.weight = data.weight;
        if (dirtyFields.targetWeight && data.targetWeight && !isNaN(data.targetWeight)) updatedProfile.targetWeight = data.targetWeight;
        if (dirtyFields.targetDate && data.targetDate) updatedProfile.targetDate = Timestamp.fromDate(data.targetDate);
        
        batch.update(userRef, updatedProfile);

        if (dirtyFields.weight && updatedProfile.weight) {
            const weightLogRef = doc(collection(firestore, 'users', userId, 'weight_logs'));
            const newLog = {
                userId: userId,
                weight: updatedProfile.weight,
                date: getLocalDateString(new Date()),
                createdAt: serverTimestamp(),
            };
            batch.set(weightLogRef, newLog);
        }

        if (userProfile.patientRoomId && (dirtyFields.weight)) {
            const roomRef = doc(firestore, 'rooms', userProfile.patientRoomId);
            const updatedPatientInfo: { [key: string]: any } = {};
            if (dirtyFields.weight && updatedProfile.weight) {
                updatedPatientInfo['patientInfo.weight'] = updatedProfile.weight;
            }
            
            if (Object.keys(updatedPatientInfo).length > 0) {
                batch.update(roomRef, updatedPatientInfo);
            }
        }
        await batch.commit();
        
        // This will trigger the useUser hook to update the profile state application-wide
        // onProfileUpdate(updatedProfile);

        toast({
            title: 'Metas Salvas',
            description: 'Suas metas foram atualizadas com sucesso.',
        });

    } catch (error: any) {
        console.error("Error updating goals:", error);
        toast({
            title: 'Erro ao Salvar Metas',
            description: error.message || 'Não foi possível atualizar suas metas. Tente novamente.',
            variant: 'destructive',
        });
    } finally {
        onOpenChange(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl p-0 sm:p-6">
        <DialogHeader className='p-6 pb-0 sm:p-0'>
          <DialogTitle className="text-2xl font-bold">Ajustar Metas de Saúde</DialogTitle>
          <DialogDescription>
            Atualize seu peso e metas diárias para uma experiência mais precisa.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <Tabs defaultValue="weight" className="w-full pt-4">
               <TabsList className="grid w-full grid-cols-2 mx-auto max-w-[calc(100%-3rem)] sm:max-w-sm">
                    <TabsTrigger value="weight"><Weight className="mr-2 h-4 w-4"/>Peso</TabsTrigger>
                    <TabsTrigger value="daily"><Target className="mr-2 h-4 w-4"/>Metas</TabsTrigger>
                </TabsList>
                 <div className='p-6 sm:p-0'>
                    <TabsContent value="weight" className="mt-6 space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormField control={form.control} name="weight" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Peso Atual (kg)</FormLabel>
                                    <FormControl><Input type="number" step="0.1" placeholder="Seu peso atual" {...field} onChange={e => field.onChange(e.target.valueAsNumber)} value={isNaN(field.value) ? '' : field.value} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                            <FormField control={form.control} name="targetWeight" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Peso Meta (kg)</FormLabel>
                                    <FormControl><Input type="number" step="0.1" placeholder="Seu peso desejado" {...field} onChange={e => field.onChange(e.target.valueAsNumber)} value={isNaN(field.value) ? '' : field.value} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                        </div>
                        <FormField control={form.control} name="targetDate" render={({ field }) => (
                            <FormItem className='flex flex-col py-1'><FormLabel>Data para Atingir a Meta</FormLabel>
                            <Popover><PopoverTrigger asChild><FormControl>
                                <Button variant={"outline"} className={cn("pl-3 text-left font-normal",!field.value && "text-muted-foreground")}>
                                    {field.value ? (format(field.value, "PPP", { locale: ptBR })) : (<span>Escolha uma data</span>)}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                            </FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start">
                                <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date < new Date() || date < new Date("1900-01-01")} initialFocus/>
                            </PopoverContent></Popover><FormMessage /></FormItem>
                        )}/>
                    </TabsContent>
                    <TabsContent value="daily" className="mt-6">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <FormField control={form.control} name="calorieGoal" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className='flex items-center gap-1.5'><Flame className='h-4 w-4 text-orange-500'/>Calorias (kcal)</FormLabel>
                                    <FormControl><Input type="number" placeholder="Ex: 2200" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                            <FormField control={form.control} name="proteinGoal" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className='flex items-center gap-1.5'><Rocket className='h-4 w-4 text-blue-500'/>Proteínas (g)</FormLabel>
                                    <FormControl><Input type="number" placeholder="Ex: 150" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                            <FormField control={form.control} name="waterGoal" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className='flex items-center gap-1.5'><Droplet className='h-4 w-4 text-sky-500'/>Água (ml)</FormLabel>
                                    <FormControl><Input type="number" placeholder="Ex: 2000" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                        </div>
                    </TabsContent>
                 </div>
            </Tabs>
            
            <DialogFooter className="!mt-8 gap-2 px-6 pb-6 sm:px-0 sm:pb-0 sm:gap-0 sm:space-x-2 flex-col sm:flex-row">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className='w-full sm:w-auto'>Cancelar</Button>
                <Button type="submit" disabled={isSubmitting || !isDirty} className='w-full sm:w-auto'>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Salvar Alterações
                </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
