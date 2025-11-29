// src/components/weight-reminder-card.tsx
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Weight, Save, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormMessage } from './ui/form';

interface WeightReminderCardProps {
    currentWeight?: number;
    onWeightSubmit: (weight: number) => Promise<void>;
}

const formSchema = z.object({
  weight: z.coerce.number().positive('O peso deve ser um número positivo.'),
});

type FormValues = z.infer<typeof formSchema>;

export default function WeightReminderCard({ currentWeight, onWeightSubmit }: WeightReminderCardProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      weight: currentWeight || undefined,
    },
  });

  const handleSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    await onWeightSubmit(data.weight);
    setIsSubmitting(false);
  };

  return (
    <Card className="shadow-lg rounded-2xl animate-fade-in border-primary/20 bg-primary/5">
        <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
                <Weight className="h-6 w-6 text-primary" />
                <div>
                    <CardTitle className="text-lg">Atualize seu Peso</CardTitle>
                    <CardDescription>Registre seu peso de hoje para acompanhar o progresso.</CardDescription>
                </div>
            </div>
        </CardHeader>
        <CardContent>
             <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="flex items-start gap-2">
                    <FormField
                        control={form.control}
                        name="weight"
                        render={({ field }) => (
                            <FormItem className='flex-1'>
                                <FormControl>
                                    <Input 
                                        type="number" 
                                        step="0.1" 
                                        placeholder="Seu peso em kg" 
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage className='text-xs' />
                            </FormItem>
                        )}
                    />
                    <Button type="submit" disabled={isSubmitting}>
                         {isSubmitting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                         ) : (
                            <Save className="h-4 w-4" />
                         )}
                         <span className="sr-only">Salvar peso</span>
                    </Button>
                </form>
             </Form>
        </CardContent>
    </Card>
  );
}
