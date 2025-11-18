// src/components/ai-plan-confirmation-modal.tsx
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, BrainCircuit, Weight, Target, CalendarDays, Droplet, Flame, Rocket, PlusCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from './ui/form';
import { Input } from './ui/input';
import { type Control, type UseFormReturn } from 'react-hook-form';

interface AIPlanConfirmationModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onConfirm: () => void;
  data: {
    weight?: number;
    targetWeight?: number;
    targetDate?: Date;
  };
  isLoading: boolean;
  form: UseFormReturn<any>;
}

const InfoItem = ({ icon: Icon, label, value, unit }: { icon: React.ElementType, label: string, value?: string | number, unit?: string }) => (
    <div className='flex items-center gap-4 rounded-2xl border p-3 bg-card'>
        <div className='p-2 bg-primary/10 rounded-lg text-primary'>
            <Icon className='h-5 w-5' />
        </div>
        <div>
            <p className='text-sm text-muted-foreground'>{label}</p>
            <p className='font-bold text-lg text-foreground'>
                {value ?? 'N/A'} {value ? unit : ''}
            </p>
        </div>
    </div>
);


export default function AIPlanConfirmationModal({ isOpen, onOpenChange, onConfirm, data, isLoading, form }: AIPlanConfirmationModalProps) {
  const { weight, targetWeight, targetDate } = data;
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 sm:p-6">
        <DialogHeader className='p-6 pb-4 sm:p-0'>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex-shrink-0 bg-primary/10 text-primary p-3 rounded-full">
                <BrainCircuit className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold">Confirmar Dados para a IA</DialogTitle>
              <DialogDescription>
                A IA usará seus objetivos para criar um plano. Revise os dados abaixo.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-4 max-h-[60vh] overflow-y-auto px-6 sm:px-0 sm:pr-2 space-y-6">
            <div>
                <h3 className='font-semibold mb-2 text-foreground'>Seus Objetivos</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <InfoItem icon={Weight} label="Peso Atual" value={weight} unit="kg" />
                    <InfoItem icon={Target} label="Peso Meta" value={targetWeight} unit="kg" />
                    <InfoItem 
                        icon={CalendarDays} 
                        label="Data Meta" 
                        value={targetDate ? format(targetDate, "dd/MM/yyyy", { locale: ptBR }) : undefined} 
                    />
                </div>
            </div>

            <Form {...form}>
              <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
                  <CollapsibleTrigger asChild>
                      <Button variant="link" className="p-0 h-auto text-sm">
                          <PlusCircle className="mr-2 h-4 w-4" />
                          Definir Metas Manuais (Opcional)
                      </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-4 space-y-4 animate-in fade-in-0 zoom-in-95">
                      <div className="rounded-2xl border p-4 grid grid-cols-1 md:grid-cols-3 gap-4 bg-secondary/30">
                          <FormField control={form.control} name="calorieGoal" render={({ field }) => (
                              <FormItem>
                                  <FormLabel className='flex items-center gap-2 text-xs'><Flame className='h-4 w-4 text-orange-500'/> Calorias</FormLabel>
                                  <FormControl><Input type="number" {...field} className="h-9"/></FormControl><FormMessage />
                              </FormItem>
                          )}/>
                          <FormField control={form.control} name="proteinGoal" render={({ field }) => (
                              <FormItem>
                                  <FormLabel className='flex items-center gap-2 text-xs'><Rocket className='h-4 w-4 text-blue-500'/> Proteínas</FormLabel>
                                  <FormControl><Input type="number" {...field} className="h-9"/></FormControl><FormMessage />
                              </FormItem>
                          )}/>
                          <FormField control={form.control} name="hydrationGoal" render={({ field }) => (
                              <FormItem>
                                  <FormLabel className='flex items-center gap-2 text-xs'><Droplet className='h-4 w-4 text-sky-500'/> Hidratação</FormLabel>
                                  <FormControl><Input type="number" {...field} className="h-9"/></FormControl><FormMessage />
                              </FormItem>
                          )}/>
                      </div>
                  </CollapsibleContent>
              </Collapsible>
            </Form>
        </div>

        <DialogFooter className="!mt-6 gap-2 sm:gap-0 p-6 pt-0 sm:p-0 flex-col sm:flex-row sm:space-x-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading} className='w-full sm:w-auto'>
            Cancelar
          </Button>
          <Button type="button" onClick={onConfirm} disabled={isLoading} className='w-full sm:w-auto'>
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            Gerar Plano com IA
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
