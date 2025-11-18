// src/components/pro/create-guideline-modal.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';


const formSchema = z.object({
  title: z.string().min(3, 'O título é obrigatório.'),
  content: z.string().min(10, 'O conteúdo da orientação é obrigatório.'),
});

type GuidelineFormValues = z.infer<typeof formSchema>;

interface CreateGuidelineModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  userId: string;
}

export default function CreateGuidelineModal({ isOpen, onOpenChange, userId }: CreateGuidelineModalProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const form = useForm<GuidelineFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      content: '',
    },
  });

  const { isSubmitting } = form.formState;

  const onSubmit = async (data: GuidelineFormValues) => {
    if (!firestore || !userId) {
        toast({ title: 'Erro', description: 'Não foi possível conectar ao banco de dados.', variant: 'destructive' });
        return;
    }
    
    try {
        const guidelinesRef = collection(firestore, `users/${userId}/guidelines`);
        await addDoc(guidelinesRef, { ...data, createdAt: serverTimestamp() });
        toast({
            title: "Orientação Salva!",
            description: "Sua nova orientação foi adicionada à biblioteca.",
        });
        form.reset();
        onOpenChange(false);
    } catch (error: any) {
        console.error('Error creating guideline:', error);
        toast({
            title: "Erro ao Salvar",
            description: error.message || "Não foi possível salvar a orientação.",
            variant: "destructive",
        });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader className='p-6 pb-0'>
          <DialogTitle className="text-2xl font-bold">Nova Orientação</DialogTitle>
          <DialogDescription>
            Crie um texto de orientação para reutilizar com seus pacientes (ex: lista de compras, dicas).
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-6 pt-4">
            <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem>
                    <FormLabel>Título da Orientação *</FormLabel>
                    <FormControl><Input placeholder="Ex: Lista de Compras Low-Carb" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
            )}/>
            <FormField control={form.control} name="content" render={({ field }) => (
                <FormItem>
                    <FormLabel>Conteúdo *</FormLabel>
                    <FormControl><Textarea placeholder="Liste os itens, dicas, etc." {...field} rows={8} /></FormControl>
                    <FormMessage />
                </FormItem>
            )}/>
            <DialogFooter className="!mt-8 gap-2 flex-col sm:flex-row">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className='w-full sm:w-auto'>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting} className='w-full sm:w-auto'>
                 {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Salvar Orientação
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
