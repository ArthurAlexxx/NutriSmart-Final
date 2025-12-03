// src/components/edit-meal-modal.tsx
'use client';

import { useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Save } from 'lucide-react';
import { type MealEntry } from '@/types/meal';

const formSchema = z.object({
  calorias: z.coerce.number().min(0, 'As calorias não podem ser negativas.'),
  proteinas: z.coerce.number().min(0, 'As proteínas não podem ser negativas.'),
  carboidratos: z.coerce.number().min(0, 'Os carboidratos não podem ser negativos.'),
  gorduras: z.coerce.number().min(0, 'As gorduras não podem ser negativas.'),
});

type EditMealFormValues = z.infer<typeof formSchema>;

interface EditMealModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  mealEntry: MealEntry;
  onMealUpdate: (updatedMeal: MealEntry) => void;
}

export default function EditMealModal({ isOpen, onOpenChange, mealEntry, onMealUpdate }: EditMealModalProps) {
  const form = useForm<EditMealFormValues>({
    resolver: zodResolver(formSchema),
  });

  const { isSubmitting } = form.formState;

  useEffect(() => {
    if (mealEntry) {
      form.reset({
        calorias: parseFloat(mealEntry.mealData.totais.calorias.toFixed(2)),
        proteinas: parseFloat(mealEntry.mealData.totais.proteinas.toFixed(2)),
        carboidratos: parseFloat((mealEntry.mealData.totais.carboidratos || 0).toFixed(2)),
        gorduras: parseFloat((mealEntry.mealData.totais.gorduras || 0).toFixed(2)),
      });
    }
  }, [mealEntry, form]);

  const onSubmit = (data: EditMealFormValues) => {
    const updatedMeal: MealEntry = {
      ...mealEntry,
      mealData: {
        ...mealEntry.mealData,
        totais: {
            ...mealEntry.mealData.totais,
            calorias: data.calorias,
            proteinas: data.proteinas,
            carboidratos: data.carboidratos,
            gorduras: data.gorduras,
        },
        alimentos: [{
            ...mealEntry.mealData.alimentos[0],
            nome: `(Editado) ${mealEntry.mealData.alimentos.map(f => f.nome).join(', ')}`.substring(0, 100),
            portion: 1,
            unit: 'porção'
        }]
      },
    };
    if (updatedMeal.mealData.alimentos.length > 1) {
       updatedMeal.mealData.alimentos = [updatedMeal.mealData.alimentos[0]];
    }

    onMealUpdate(updatedMeal);
  };

  const getMealTypeName = (type: string) => {
    switch (type) {
        case 'cafe-da-manha': return 'Café da Manhã';
        case 'almoco': return 'Almoço';
        case 'jantar': return 'Jantar';
        case 'lanche': return 'Lanche';
        default: return 'Refeição';
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl" onOpenAutoFocus={(e) => e.preventDefault()}>
        <SheetHeader className='text-left'>
          <SheetTitle className="text-2xl font-bold">Editar Refeição</SheetTitle>
          <SheetDescription>
            Ajuste os totais para: <span className='font-semibold text-foreground'>{getMealTypeName(mealEntry.mealType)}</span>.
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                control={form.control}
                name="calorias"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel className="font-semibold">Calorias (kcal)</FormLabel>
                    <FormControl>
                        <Input type="number" step="0.01" placeholder="Ex: 500" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                
                <FormField
                control={form.control}
                name="proteinas"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel className="font-semibold">Proteínas (g)</FormLabel>
                    <FormControl>
                        <Input type="number" step="0.01" placeholder="Ex: 30" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />

                <FormField
                control={form.control}
                name="carboidratos"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel className="font-semibold">Carboidratos (g)</FormLabel>
                    <FormControl>
                        <Input type="number" step="0.01" placeholder="Ex: 55" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />

                <FormField
                control={form.control}
                name="gorduras"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel className="font-semibold">Gorduras (g)</FormLabel>
                    <FormControl>
                        <Input type="number" step="0.01" placeholder="Ex: 20" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>
            <SheetFooter className="!mt-8 gap-2 sm:gap-0 sm:space-x-2 flex-col sm:flex-row">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className='w-full sm:w-auto'>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting} className='w-full sm:w-auto'>
                 {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                Salvar
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
