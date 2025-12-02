// src/components/goals-modal.tsx
'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Save, Flame, Rocket, Droplet } from 'lucide-react';
import type { UserProfile } from '@/types/user';

const goalsSchema = z.object({
  calorieGoal: z.coerce.number().min(1, 'A meta de calorias é obrigatória.'),
  proteinGoal: z.coerce.number().min(1, 'A meta de proteína é obrigatória.'),
  waterGoal: z.coerce.number().min(1, 'A meta de água é obrigatória.'),
});

type GoalsFormValues = z.infer<typeof goalsSchema>;

interface GoalsModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  userProfile: UserProfile;
  onProfileUpdate: (updatedProfile: Partial<UserProfile>) => Promise<void>;
}

export default function GoalsModal({ isOpen, onOpenChange, userProfile, onProfileUpdate }: GoalsModalProps) {
  const form = useForm<GoalsFormValues>({
    resolver: zodResolver(goalsSchema),
    defaultValues: {
      calorieGoal: userProfile?.calorieGoal || 2000,
      proteinGoal: userProfile?.proteinGoal || 140,
      waterGoal: userProfile?.waterGoal || 2000,
    },
  });

  useEffect(() => {
    if (userProfile) {
      form.reset({
        calorieGoal: userProfile.calorieGoal || 2000,
        proteinGoal: userProfile.proteinGoal || 140,
        waterGoal: userProfile.waterGoal || 2000,
      });
    }
  }, [userProfile, form]);
  
  const watchedCalorieGoal = form.watch('calorieGoal');

  useEffect(() => {
      if (watchedCalorieGoal > 0 && form.formState.dirtyFields.calorieGoal) {
          const newProteinGoal = Math.round((watchedCalorieGoal * 0.35) / 4);
          form.setValue('proteinGoal', newProteinGoal, { shouldDirty: true });
      }
  }, [watchedCalorieGoal, form]);

  const { isSubmitting, isDirty } = form.formState;

  const handleSubmit = async (data: GoalsFormValues) => {
    await onProfileUpdate(data);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajustar Metas Nutricionais</DialogTitle>
          <DialogDescription>
            Defina suas metas diárias de calorias, proteínas e hidratação. A meta de proteína será sugerida com base nas calorias.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 pt-4">
            <FormField
              control={form.control}
              name="calorieGoal"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className='flex items-center gap-2'><Flame className='h-5 w-5 text-orange-500'/> Meta de Calorias (kcal)</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="proteinGoal"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className='flex items-center gap-2'><Rocket className='h-5 w-5 text-blue-500'/> Meta de Proteínas (g)</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="waterGoal"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className='flex items-center gap-2'><Droplet className='h-5 w-5 text-sky-500'/> Meta de Água (ml)</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className='!mt-8'>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting || !isDirty}>
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Salvar Metas
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
