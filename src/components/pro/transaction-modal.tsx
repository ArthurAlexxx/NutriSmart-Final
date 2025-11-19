// src/components/pro/transaction-modal.tsx
'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Loader2, Save, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, Timestamp } from 'firebase/firestore';
import type { FinancialTransaction } from '@/types/finance';
import { cn } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"

const formSchema = z.object({
  description: z.string().min(3, 'A descrição é obrigatória.'),
  amount: z.coerce.number().positive('O valor deve ser maior que zero.'),
  type: z.enum(['income', 'expense'], { required_error: 'Selecione o tipo.' }),
  category: z.string().min(1, 'A categoria é obrigatória.'),
  date: z.date({ required_error: 'A data é obrigatória.' }),
});

type TransactionFormValues = z.infer<typeof formSchema>;

const expenseCategories = ['Consultório', 'Marketing', 'Software', 'Impostos', 'Outros'];
const incomeCategories = ['Consulta', 'Plano Alimentar', 'Serviços', 'Outros'];

interface TransactionModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  userId: string;
  transaction: FinancialTransaction | null;
}

export default function TransactionModal({ isOpen, onOpenChange, userId, transaction }: TransactionModalProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: '',
      amount: 0,
      type: 'expense',
      category: '',
      date: new Date(),
    },
  });

  const { isSubmitting } = form.formState;
  const transactionType = form.watch('type');

  useEffect(() => {
    if (isOpen && transaction) {
      form.reset({
        description: transaction.description,
        amount: transaction.amount,
        type: transaction.type,
        category: transaction.category,
        date: transaction.date.toDate(),
      });
    } else {
      form.reset({
        description: '',
        amount: 0,
        type: 'expense',
        category: '',
        date: new Date(),
      });
    }
  }, [isOpen, transaction, form]);
  
  useEffect(() => {
    form.setValue('category', '');
  }, [transactionType, form]);


  const onSubmit = async (data: TransactionFormValues) => {
    if (!firestore || !userId) {
        toast({ title: 'Erro de Autenticação', description: 'Usuário não autenticado ou banco de dados indisponível.', variant: 'destructive'});
        return;
    }

    try {
      const transactionData = {
        ...data,
        userId,
        date: Timestamp.fromDate(data.date),
      };

      if (transaction) {
        const transactionRef = doc(firestore, 'users', userId, 'transactions', transaction.id);
        await updateDoc(transactionRef, transactionData);
        toast({ title: 'Transação Atualizada!' });
      } else {
        const transactionsRef = collection(firestore, 'users', userId, 'transactions');
        await addDoc(transactionsRef, { ...transactionData, createdAt: serverTimestamp() });
        toast({ title: 'Transação Adicionada!' });
      }

      onOpenChange(false);

    } catch (error: any) {
      console.error("Error saving transaction:", error);
      toast({ title: 'Erro ao Salvar Transação', description: error.message || 'Não foi possível salvar a transação.', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!firestore || !transaction) {
        toast({ title: 'Erro', description: 'Transação não encontrada para remoção.', variant: 'destructive'});
        return;
    }

    try {
        const transactionRef = doc(firestore, 'users', userId, 'transactions', transaction.id);
        await deleteDoc(transactionRef);
        toast({ title: 'Transação Removida!' });
        onOpenChange(false);
    } catch (error: any) {
        toast({ title: 'Erro ao Remover Transação', description: error.message || "Não foi possível remover a transação.", variant: 'destructive' });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className='p-6 pb-0'>
          <DialogTitle className="text-2xl font-bold">{transaction ? 'Editar' : 'Nova'} Transação</DialogTitle>
          <DialogDescription>
            {transaction ? 'Atualize os detalhes desta transação.' : 'Adicione uma nova receita ou despesa.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-6 pt-4">
             <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo *</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex gap-4"
                    >
                      <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="expense" /></FormControl><FormLabel className="font-normal">Despesa</FormLabel></FormItem>
                      <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="income" /></FormControl><FormLabel className="font-normal">Receita</FormLabel></FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>Descrição *</FormLabel><FormControl><Input placeholder="Ex: Aluguel do consultório" {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
            
            <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="amount" render={({ field }) => (
                    <FormItem><FormLabel>Valor (R$) *</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={form.control} name="date" render={({ field }) => (
                    <FormItem><FormLabel>Data *</FormLabel>
                    <Popover><PopoverTrigger asChild><FormControl>
                        <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                            {field.value ? format(field.value, "dd/MM/yyyy") : <span>Escolha a data</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                    </FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus/>
                    </PopoverContent></Popover><FormMessage /></FormItem>
                )}/>
            </div>

            <FormField control={form.control} name="category" render={({ field }) => (
                <FormItem><FormLabel>Categoria *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione uma categoria" /></SelectTrigger></FormControl>
                    <SelectContent>
                        {(transactionType === 'expense' ? expenseCategories : incomeCategories).map(cat => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                    </SelectContent>
                </Select><FormMessage /></FormItem>
            )}/>

            <DialogFooter className="!mt-8 gap-2 flex-col sm:flex-row">
                {transaction && (
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button type="button" variant="destructive" className="mr-auto w-full sm:w-auto">
                                <Trash2 className="mr-2 h-4 w-4" /> Excluir
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                                <AlertDialogDescription>Tem certeza que deseja excluir esta transação? Esta ação não pode ser desfeita.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Excluir</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className='w-full sm:w-auto'>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting} className='w-full sm:w-auto'>
                 {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
