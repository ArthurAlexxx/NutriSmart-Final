// src/components/pro/create-plan-template-modal.tsx
'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Plus, Save, Trash2, Droplet, Flame } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const mealPlanItemSchema = z.object({
  name: z.string().min(1, 'O tipo de refeição é obrigatório.'),
  time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:MM).'),
  items: z.string().min(3, 'Descreva os itens da refeição.'),
});

const formSchema = z.object({
  name: z.string().min(3, 'O nome do modelo é obrigatório.'),
  description: z.string().optional(),
  calorieGoal: z.coerce.number().min(1, 'A meta de calorias é obrigatória.'),
  hydrationGoal: z.coerce.number().min(1, 'A meta de hidratação é obrigatória.'),
  meals: z.array(mealPlanItemSchema).min(1, 'Adicione pelo menos uma refeição ao modelo.'),
});

type PlanTemplateFormValues = z.infer<typeof formSchema>;

interface CreatePlanTemplateModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  userId: string;
}

const defaultMealValues: Omit<z.infer<typeof mealPlanItemSchema>, 'id'> = { name: '', time: '08:00', items: '' };

const mealTypeOptions = [
    { value: 'Café da Manhã', label: 'Café da Manhã' },
    { value: 'Lanche da Manhã', label: 'Lanche da Manhã' },
    { value: 'Almoço', label: 'Almoço' },
    { value: 'Lanche da Tarde', label: 'Lanche da Tarde' },
    { value: 'Jantar', label: 'Jantar' },
    { value: 'Ceia', label: 'Ceia' },
];

export default function CreatePlanTemplateModal({ isOpen, onOpenChange, userId }: CreatePlanTemplateModalProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const form = useForm<PlanTemplateFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      calorieGoal: NaN,
      hydrationGoal: NaN,
      meals: [defaultMealValues],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'meals',
  });

  const { isSubmitting } = form.formState;

  const onSubmit = async (data: PlanTemplateFormValues) => {
    if (!firestore || !userId) {
        toast({ title: 'Erro', description: 'Não foi possível conectar ao banco de dados.', variant: 'destructive' });
        return;
    }
    
    try {
        const templatesRef = collection(firestore, `users/${userId}/plan_templates`);
        await addDoc(templatesRef, { ...data, createdAt: serverTimestamp() });
        toast({
            title: "Modelo Criado!",
            description: "Seu novo modelo de plano foi salvo na biblioteca.",
        });
        form.reset();
        onOpenChange(false);
    } catch (error: any) {
        console.error('Error creating plan template:', error);
        toast({
            title: "Erro ao Criar Modelo",
            description: error.message || 'Ocorreu um erro desconhecido.',
            variant: "destructive",
        });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl flex flex-col p-0 max-h-[90svh]">
        <DialogHeader className='p-6 pb-4 shrink-0'>
          <DialogTitle className="text-2xl font-bold">Novo Modelo de Plano</DialogTitle>
          <DialogDescription>
            Crie um plano alimentar base para reutilizar com seus pacientes.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto px-6">
                <div className="space-y-6 pt-4">
                    <FormField control={form.control} name="name" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Nome do Modelo *</FormLabel>
                            <FormControl><Input placeholder="Ex: Plano de Emagrecimento (2000 kcal)" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}/>
                    <FormField control={form.control} name="description" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Descrição (Opcional)</FormLabel>
                            <FormControl><Textarea placeholder="Descreva o objetivo deste plano" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}/>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField control={form.control} name="calorieGoal" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="flex items-center gap-2"><Flame className="h-4 w-4" /> Meta de Calorias (kcal) *</FormLabel>
                                <FormControl><Input type="number" placeholder="Ex: 2000" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}/>
                        <FormField control={form.control} name="hydrationGoal" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="flex items-center gap-2"><Droplet className="h-4 w-4" /> Meta de Hidratação (ml) *</FormLabel>
                                <FormControl><Input type="number" placeholder="Ex: 2500" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}/>
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold">Refeições *</h3>
                            <Button type="button" variant="outline" size="sm" onClick={() => append(defaultMealValues)}><Plus className="mr-2 h-4 w-4" /> Nova Refeição</Button>
                        </div>
                        <div className="space-y-4">
                            {fields.map((field, index) => (
                                <div key={field.id} className="rounded-2xl border p-4 space-y-4 relative bg-secondary/30">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <FormField control={form.control} name={`meals.${index}.name`} render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Tipo</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        {mealTypeOptions.map(option => (
                                                            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}/>
                                        <FormField control={form.control} name={`meals.${index}.time`} render={({ field }) => (
                                            <FormItem><FormLabel>Horário</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>
                                        )}/>
                                    </div>
                                    <FormField control={form.control} name={`meals.${index}.items`} render={({ field }) => (
                                        <FormItem><FormLabel>Itens da Refeição</FormLabel><FormControl><Textarea placeholder="Ex: 2 ovos, 1 fatia de pão integral..." {...field} rows={3} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                    {fields.length > 1 && (
                                        <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => remove(index)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            ))}
                            <FormMessage>{form.formState.errors.meals?.root?.message || form.formState.errors.meals?.message}</FormMessage>
                        </div>
                    </div>
                </div>
            </div>
            <DialogFooter className="p-6 pt-6 gap-2 border-t shrink-0 flex-col sm:flex-row">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className='w-full sm:w-auto'>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting} className='w-full sm:w-auto'>
                 {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Salvar Modelo
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
