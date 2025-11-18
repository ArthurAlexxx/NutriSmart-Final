// src/components/add-meal-form.tsx

// This component is no longer used on the landing page demo.
// It is kept for potential use inside the authenticated app area.
// For now, its content can be cleared to avoid confusion.
'use client';

import { useState, useEffect } from 'react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Totals } from '@/types/meal';

const foodItemSchema = z.object({
  name: z.string().min(1, 'O nome do alimento é obrigatório.'),
  portion: z.coerce.number().min(0.1, 'A porção deve ser maior que 0.'),
  unit: z.string().min(1, 'A unidade é obrigatória.'),
});

const formSchema = z.object({
  mealType: z.string().min(1, 'O tipo de refeição é obrigatório.'),
  foods: z.array(foodItemSchema).min(1, 'Adicione pelo menos um alimento.'),
});

type AddMealFormValues = z.infer<typeof formSchema>;

interface AddMealFormProps {
  onTotalsChange: (totals: Totals | null) => void;
  onFoodsChange?: (foods: any[]) => void;
  onMealTypeChange?: (mealType: string) => void;
  isPreviewMode?: boolean;
  userId?: string;
}

export default function AddMealForm({ onTotalsChange, onFoodsChange, onMealTypeChange, isPreviewMode = false, userId }: AddMealFormProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const form = useForm<AddMealFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      mealType: '',
      foods: [{ name: '', portion: 100, unit: 'g' }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'foods',
  });
  
  useEffect(() => {
    const subscription = form.watch((value) => {
        if (onFoodsChange) onFoodsChange(value.foods || []);
        if (onMealTypeChange) onMealTypeChange(value.mealType || '');

        // For preview mode on landing page, simulate calculation
        if(isPreviewMode) {
             const data = form.getValues();
             const validation = formSchema.safeParse(data);
             if(validation.success && data.foods.length > 0) {
                 const dummyTotals: Totals = data.foods.reduce((acc, food) => {
                    acc.calorias += (food.portion || 0) * 1.5;
                    acc.proteinas += (food.portion || 0) * 0.5;
                    acc.carboidratos += (food.portion || 0) * 0.8;
                    acc.gorduras += (food.portion || 0) * 0.3;
                    return acc;
                }, { calorias: 0, proteinas: 0, carboidratos: 0, gorduras: 0, fibras: 0 });
                onTotalsChange(dummyTotals);
             } else {
                 onTotalsChange(null);
             }
        }
    });
    return () => subscription.unsubscribe();
  }, [form, onFoodsChange, onMealTypeChange, isPreviewMode, onTotalsChange]);


  return (
    <Form {...form}>
        <div className="space-y-6">
            <FormField
            control={form.control}
            name="mealType"
            render={({ field }) => (
                <FormItem>
                <FormLabel className="font-semibold">Tipo de Refeição *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                    <SelectTrigger><SelectValue placeholder="Selecionar tipo de refeição" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                    <SelectItem value="cafe-da-manha">Café da Manhã</SelectItem>
                    <SelectItem value="almoco">Almoço</SelectItem>
                    <SelectItem value="jantar">Jantar</SelectItem>
                    <SelectItem value="lanche">Lanche</SelectItem>
                    </SelectContent>
                </Select>
                <FormMessage />
                </FormItem>
            )}
            />

            <div>
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Alimentos *</h3>
                 <div className='flex items-center gap-2'>
                    {isProcessing && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                    <Button type="button" variant="outline" size="sm" onClick={() => append({ name: '', portion: 100, unit: 'g' })}>
                        <Plus className="mr-2 h-4 w-4" /> Adicionar
                    </Button>
                 </div>
            </div>

            <div className="space-y-4">
                {fields.map((field, index) => (
                <div key={field.id} className="rounded-2xl border p-4 space-y-4 relative bg-secondary/30">
                    <p className="font-semibold text-sm text-muted-foreground">Alimento {index + 1}</p>
                    {fields.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => remove(index)}>
                        <Trash2 className="h-4 w-4" />
                    </Button>
                    )}
                    <FormField
                    control={form.control}
                    name={`foods.${index}.name`}
                    render={({ field }) => (
                        <FormItem><FormLabel>Nome *</FormLabel><FormControl><Input placeholder="Ex: Peito de frango grelhado" {...field} /></FormControl><FormMessage /></FormItem>
                    )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name={`foods.${index}.portion`}
                        render={({ field }) => (
                        <FormItem><FormLabel>Porção *</FormLabel><FormControl><Input type="number" placeholder="Ex: 150" {...field} /></FormControl><FormMessage /></FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name={`foods.${index}.unit`}
                        render={({ field }) => (
                        <FormItem><FormLabel>Unidade *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Un." /></SelectTrigger></FormControl>
                            <SelectContent>
                                <SelectItem value="g">g (gramas)</SelectItem>
                                <SelectItem value="ml">ml (mililitros)</SelectItem>
                                <SelectItem value="un">un (unidade)</SelectItem>
                                <SelectItem value="fatia">fatia</SelectItem>
                                <SelectItem value="xicara">xícara</SelectItem>
                                <SelectItem value="colher-sopa">colher de sopa</SelectItem>
                            </SelectContent>
                            </Select>
                        <FormMessage /></FormItem>
                        )}
                    />
                    </div>
                </div>
                ))}
                {form.formState.errors.foods && <FormMessage className='pt-2'>{form.formState.errors.foods.message || form.formState.errors.foods.root?.message}</FormMessage>}
            </div>
            </div>
        </div>
    </Form>
  );
}
