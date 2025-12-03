// src/components/add-meal-modal.tsx
'use client';

import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Loader2, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import type { MealData, MealEntry, Totals } from '@/types/meal';
import AddMealForm from './add-meal-form';

interface AddMealModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  userId: string;
}

export default function AddMealModal({ isOpen, onOpenChange, userId }: AddMealModalProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentTotals, setCurrentTotals] = useState<Totals | null>(null);
  const [currentFoods, setCurrentFoods] = useState<any[]>([]);
  const [currentMealType, setCurrentMealType] = useState<string>('');


  const handleFormSubmit = async () => {
    if (!firestore || !userId) {
      toast({ title: "Erro", description: "O serviço de banco de dados ou usuário não está disponível.", variant: "destructive" });
      return;
    }
     if (!currentTotals || currentFoods.length === 0 || !currentMealType) {
        toast({ title: "Dados incompletos", description: "Por favor, preencha todos os campos da refeição.", variant: "destructive" });
        return;
    }

    setIsProcessing(true);
    
    try {
      const mealData: MealData = {
        alimentos: currentFoods.map(f => ({
          name: f.name, portion: f.portion, unit: f.unit,
          calorias: 0, proteinas: 0, carboidratos: 0, gorduras: 0, fibras: 0 
        })),
        totais: currentTotals,
      };
      
      const newMealEntry: Omit<MealEntry, 'id'> = {
        userId: userId,
        date: new Intl.DateTimeFormat('sv-SE').format(new Date()),
        mealType: currentMealType,
        mealData: mealData,
        createdAt: serverTimestamp(),
      };

      const mealEntriesRef = collection(firestore, 'users', userId, 'meal_entries');
      await addDoc(mealEntriesRef, newMealEntry);

      toast({
          title: "Refeição Adicionada! ✅",
          description: "Sua refeição foi registrada com sucesso.",
      });
      onOpenChange(false);

    } catch (error: any) {
      console.error("Erro ao adicionar refeição:", error);
      toast({
        title: "Erro ao Adicionar Refeição",
        description: error.message || "Ocorreu um erro desconhecido.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl flex flex-col p-0">
        <SheetHeader className="p-6 pb-4 shrink-0">
          <SheetTitle className="text-2xl font-bold">Adicionar Nova Refeição</SheetTitle>
          <SheetDescription>
            Descreva os alimentos da sua refeição para obter a análise nutricional.
          </SheetDescription>
        </SheetHeader>

        <div className='flex-1 overflow-y-auto px-6'>
            <AddMealForm 
                onTotalsChange={(totals) => setCurrentTotals(totals)}
                onFoodsChange={(foods) => setCurrentFoods(foods)}
                onMealTypeChange={(mealType) => setCurrentMealType(mealType)}
                isPreviewMode={false}
                userId={userId}
            />
        </div>
        
        <SheetFooter className="p-6 pt-4 border-t shrink-0 gap-2 flex-col sm:flex-row">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className='w-full sm:w-auto'>
            Cancelar
          </Button>
          <Button type="button" onClick={handleFormSubmit} disabled={isProcessing} className='w-full sm:w-auto'>
            {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Adicionar Refeição
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
