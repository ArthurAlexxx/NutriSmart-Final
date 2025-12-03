// src/components/ai-plan-confirmation-modal.tsx
'use client';

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, BrainCircuit, Weight, Target, CalendarDays } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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


export default function AIPlanConfirmationModal({ isOpen, onOpenChange, onConfirm, data, isLoading }: AIPlanConfirmationModalProps) {
  const { weight, targetWeight, targetDate } = data;
  
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader className='text-left'>
            <SheetTitle className="text-2xl font-bold flex items-center gap-2"><BrainCircuit className="h-6 w-6" />Confirmar Dados para a IA</SheetTitle>
            <SheetDescription>
                A IA usará seus objetivos de peso para calcular as metas e criar um plano. Revise os dados abaixo.
            </SheetDescription>
        </SheetHeader>

        <div className="py-6 space-y-4">
            <h3 className='font-semibold text-foreground'>Seus Objetivos</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <InfoItem icon={Weight} label="Peso Atual" value={weight} unit="kg" />
                <InfoItem icon={Target} label="Peso Meta" value={targetWeight} unit="kg" />
                <InfoItem 
                    icon={CalendarDays} 
                    label="Data Meta" 
                    value={targetDate ? format(targetDate, "dd/MM/yyyy", { locale: ptBR }) : undefined} 
                />
            </div>
            <p className='text-xs text-muted-foreground pt-2'>
                As metas de calorias, proteínas e hidratação serão calculadas automaticamente pela IA para otimizar seu plano.
            </p>
        </div>

        <SheetFooter className='flex-col sm:flex-row gap-2'>
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
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
