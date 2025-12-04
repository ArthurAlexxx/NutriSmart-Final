// src/components/goals-modal.tsx
'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Save, Flame, Rocket, Droplet } from 'lucide-react';
import type { UserProfile } from '@/types/user';
import { useMediaQuery } from '@/hooks/use-media-query';
import { FaBreadSlice } from 'react-icons/fa';
import { Donut } from 'lucide-react';

const goalsSchema = z.object({
  calorieGoal: z.coerce.number().min(1, 'A meta de calorias é obrigatória.'),
  proteinGoal: z.coerce.number().min(1, 'A meta de proteína é obrigatória.'),
  carbGoal: z.coerce.number().min(1, 'A meta de carboidratos é obrigatória.'),
  fatGoal: z.coerce.number().min(1, 'A meta de gorduras é obrigatória.'),
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
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const form = useForm<GoalsFormValues>({
    resolver: zodResolver(goalsSchema),
    defaultValues: {
      calorieGoal: userProfile?.calorieGoal || 2000,
      proteinGoal: userProfile?.proteinGoal || 175,
      carbGoal: userProfile?.carbGoal || 200,
      fatGoal: userProfile?.fatGoal || 56,
      waterGoal: userProfile?.waterGoal || 2000,
    },
  });

  useEffect(() => {
    if (userProfile) {
      form.reset({
        calorieGoal: userProfile.calorieGoal || 2000,
        proteinGoal: userProfile.proteinGoal || 175,
        carbGoal: userProfile.carbGoal || 200,
        fatGoal: userProfile.fatGoal || 56,
        waterGoal: userProfile.waterGoal || 2000,
      });
    }
  }, [userProfile, form]);
  
  const watchedCalorieGoal = form.watch('calorieGoal');

  useEffect(() => {
      if (watchedCalorieGoal > 0 && form.formState.dirtyFields.calorieGoal) {
          form.setValue('proteinGoal', Math.round((watchedCalorieGoal * 0.35) / 4), { shouldDirty: true });
          form.setValue('carbGoal', Math.round((watchedCalorieGoal * 0.40) / 4), { shouldDirty: true });
          form.setValue('fatGoal', Math.round((watchedCalorieGoal * 0.25) / 9), { shouldDirty: true });
      }
  }, [watchedCalorieGoal, form]);

  const { isSubmitting, isDirty } = form.formState;

  const handleSubmit = async (data: GoalsFormValues) => {
    await onProfileUpdate(data);
    onOpenChange(false);
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-md p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
        <form onSubmit={form.handleSubmit(handleSubmit)} id="goals-form" className="flex flex-col h-full">
            <SheetHeader className="p-6 pb-4">
            <SheetTitle>Ajustar Metas Nutricionais</SheetTitle>
            <SheetDescription>
                Defina sua meta de calorias e as outras serão calculadas automaticamente seguindo uma distribuição saudável (40% Carbos, 35% Proteínas, 25% Gorduras).
            </SheetDescription>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto px-6">
            <div className="space-y-6 pt-4">
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
                    name="carbGoal"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel className='flex items-center gap-2'><FaBreadSlice className='h-5 w-5 text-yellow-500'/> Meta de Carboidratos (g)</FormLabel>
                        <FormControl>
                        <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="fatGoal"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel className='flex items-center gap-2'><Donut className='h-5 w-5 text-pink-500'/> Meta de Gorduras (g)</FormLabel>
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
            </div>
            </div>
            <SheetFooter className="p-6 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className='w-full sm:w-auto'>
                Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || !isDirty} className='w-full sm:w-auto'>
                {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                <Save className="mr-2 h-4 w-4" />
                )}
                Salvar Metas
            </Button>
            </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
