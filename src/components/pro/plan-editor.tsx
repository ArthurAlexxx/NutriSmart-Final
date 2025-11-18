
// src/components/pro/plan-editor.tsx
'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { type Room } from '@/types/room';
import { type UserProfile, type ActivePlan } from '@/types/user';
import { useToast } from '@/hooks/use-toast';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Plus, Save, Trash2, Utensils, Droplet, Flame, RotateCcw, Sparkles, Rocket, Target, Weight, CalendarIcon, FolderDown, DownloadCloud, PlayCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useUser, useFirestore } from '@/firebase';
import { doc, serverTimestamp, arrayUnion, getDoc, updateDoc, Timestamp, runTransaction } from 'firebase/firestore';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { Separator } from '../ui/separator';
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { cn } from '@/lib/utils';
import { Calendar } from '../ui/calendar';
import { ptBR } from 'date-fns/locale';
import { generateMealPlanAction } from '@/app/actions/ai-actions';
import type { GeneratedPlan } from '@/lib/ai-schemas';
import { onProfileUpdate } from '@/firebase/provider';

const formSchema = z.object({
  calorieGoal: z.coerce.number().positive('A meta de calorias deve ser positiva.'),
  proteinGoal: z.coerce.number().positive('A meta de proteínas deve ser positiva.'),
  hydrationGoal: z.coerce.number().positive('A meta de hidratação deve ser positiva.'),
  weight: z.coerce.number().min(1, 'O peso deve ser maior que 0.').optional().or(z.literal(NaN)),
  targetWeight: z.coerce.number().min(1, 'A meta de peso deve ser maior que 0.').optional().or(z.literal(NaN)),
  targetDate: z.date().optional(),
});

type PlanGoalsFormValues = z.infer<typeof formSchema>;

interface PlanEditorProps {
  room?: Room;
  userProfile?: UserProfile;
}

export default function PlanEditor({ room, userProfile }: PlanEditorProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { onProfileUpdate } = useUser();
  const isProfessionalMode = !!room;
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAIModalOpen, setAIModalOpen] = useState(false);
  
  const [generatedPlan, setGeneratedPlan] = useState<GeneratedPlan | null>(null);

  const calculatedProteinGoal = (calories: number) => Math.round((calories * 0.35) / 4);

  const getTargetDate = () => {
    const targetDate = isProfessionalMode ? room?.patientInfo?.targetDate : userProfile?.targetDate;
    if (!targetDate) return undefined;
    if (targetDate instanceof Timestamp) return targetDate.toDate();
    if (targetDate instanceof Date) return targetDate;
    return undefined;
  }

  const form = useForm<PlanGoalsFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      calorieGoal: userProfile?.calorieGoal || 2000,
      proteinGoal: userProfile?.proteinGoal || calculatedProteinGoal(userProfile?.calorieGoal || 2000),
      hydrationGoal: userProfile?.waterGoal || 2000,
      weight: userProfile?.weight || NaN,
      targetWeight: userProfile?.targetWeight || NaN,
      targetDate: getTargetDate(),
    },
  });
  
  useEffect(() => {
    if (userProfile) {
        form.reset({
            calorieGoal: userProfile.calorieGoal || 2000,
            proteinGoal: userProfile.proteinGoal || calculatedProteinGoal(userProfile.calorieGoal || 2000),
            hydrationGoal: userProfile.waterGoal || 2000,
            weight: userProfile.weight || NaN,
            targetWeight: userProfile.targetWeight || NaN,
            targetDate: getTargetDate(),
        });
    }
  }, [userProfile, form]);

  const watchedCalorieGoal = form.watch('calorieGoal');

  useEffect(() => {
      const isCalorieGoalDirty = form.formState.dirtyFields.calorieGoal;
      if (watchedCalorieGoal > 0 && isCalorieGoalDirty) {
          const newProteinGoal = calculatedProteinGoal(watchedCalorieGoal);
          form.setValue('proteinGoal', newProteinGoal, { shouldDirty: true });
      }
  }, [watchedCalorieGoal, form]);

  const handleSavePlanToSlot = async (slotIndex: number) => {
      if (!generatedPlan || !userProfile) return;
      setIsSaving(true);
      
      const newPlan = { ...generatedPlan, name: `Plano ${slotIndex + 1}` };
      const currentSavedPlans = userProfile.savedPlans || [];
      const newSavedPlans = [...currentSavedPlans];
      
      // Ensure the array has 3 slots
      while (newSavedPlans.length < 3) {
          newSavedPlans.push(null);
      }
      
      newSavedPlans[slotIndex] = newPlan;
      
      try {
        await onProfileUpdate({ savedPlans: newSavedPlans });
        toast({
            title: `Plano Salvo no Slot ${slotIndex + 1}!`,
            description: "Seu novo plano foi armazenado com sucesso.",
        });
      } catch (e: any) {
         toast({ title: "Erro ao Salvar", description: e.message, variant: "destructive" });
      } finally {
        setIsSaving(false);
      }
  }
  
  const handleActivatePlan = async (plan: ActivePlan | null) => {
      if (!plan || !userProfile) return;
      setIsSaving(true);
      try {
        await onProfileUpdate({ activePlan: plan });
        toast({ title: "Plano Ativado!", description: `O plano "${plan.name}" agora é seu plano ativo.` });
      } catch (e: any) {
        toast({ title: "Erro ao Ativar", description: e.message, variant: "destructive" });
      } finally {
        setIsSaving(false);
      }
  }

  const handleDeleteSavedPlan = async (slotIndex: number) => {
      if (!userProfile) return;
      
      const currentSavedPlans = userProfile.savedPlans || [];
      const newSavedPlans = [...currentSavedPlans];
      newSavedPlans[slotIndex] = null;
      
      setIsSaving(true);
      try {
        await onProfileUpdate({ savedPlans: newSavedPlans });
        toast({ title: "Plano Removido", description: `O plano no Slot ${slotIndex + 1} foi removido.` });
      } catch (e: any) {
         toast({ title: "Erro ao Remover", description: e.message, variant: "destructive" });
      } finally {
        setIsSaving(false);
      }
  };


  const handleConfirmAIPlan = async (goalsData: PlanGoalsFormValues) => {
    setIsGenerating(true);
    toast({
        title: "Gerando seu plano...",
        description: "Aguarde enquanto a IA prepara um plano alimentar personalizado."
    });
    
    try {
        const payload = {
            calorieGoal: goalsData.calorieGoal,
            proteinGoal: goalsData.proteinGoal,
            hydrationGoal: goalsData.hydrationGoal,
            weight: goalsData.weight,
            targetWeight: goalsData.targetWeight,
            targetDate: goalsData.targetDate ? goalsData.targetDate.toISOString().split('T')[0] : undefined,
        };

        const result = await generateMealPlanAction(payload);
        
        setGeneratedPlan(result);
        
        toast({
            title: "Plano Gerado pela IA!",
            description: "Revise o plano à direita. Se estiver bom, salve-o em um dos slots.",
        });

    } catch (error: any) {
        console.error("Erro ao gerar plano com IA:", error);
        toast({
            title: "Erro na Geração do Plano",
            description: error.message || "Não foi possível gerar o plano. Tente novamente.",
            variant: "destructive",
        });
    } finally {
        setIsGenerating(false);
    }
  };
  
  const savedPlans = userProfile?.savedPlans || [];

  return (
    <div className="animate-fade-in grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Coluna da Esquerda: Metas e Planos Salvos */}
        <div className='w-full space-y-6'>
            <Card className="shadow-sm rounded-2xl">
                <CardHeader>
                    <CardTitle>Definição de Metas</CardTitle>
                    <CardDescription>Ajuste as metas diárias e de peso. Estes dados serão usados para gerar planos com a IA.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(handleConfirmAIPlan)} id="goals-form" className="space-y-6">
                            <h4 className='font-semibold text-foreground flex items-center gap-2'><Weight className='h-5 w-5' /> Acompanhamento de Peso</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <FormField control={form.control} name="weight" render={({ field }) => (
                                    <FormItem><FormLabel>Peso Atual (kg)</FormLabel><FormControl><Input type="number" step="0.1" placeholder="Ex: 75.5" {...field} onChange={e => field.onChange(e.target.valueAsNumber)} value={isNaN(field.value) ? '' : field.value} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name="targetWeight" render={({ field }) => (
                                    <FormItem><FormLabel>Peso Meta (kg)</FormLabel><FormControl><Input type="number" step="0.1" placeholder="Ex: 70" {...field} onChange={e => field.onChange(e.target.valueAsNumber)} value={isNaN(field.value) ? '' : field.value} /></FormControl><FormMessage /></FormItem>
                                )}/>
                            </div>
                            <FormField control={form.control} name="targetDate" render={({ field }) => (
                                <FormItem className='flex flex-col py-1'><FormLabel>Data para Atingir a Meta</FormLabel>
                                <Popover><PopoverTrigger asChild><FormControl>
                                    <Button variant={"outline"} className={cn("pl-3 text-left font-normal",!field.value && "text-muted-foreground")}>
                                        {field.value ? (format(field.value, "PPP", { locale: ptBR })) : (<span>Escolha uma data</span>)}
                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                </FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start">
                                    <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date < new Date() || date < new Date("1900-01-01")} initialFocus/>
                                </PopoverContent></Popover><FormMessage /></FormItem>
                            )}/>
                            <Separator />
                            <h4 className='font-semibold text-foreground pt-2 flex items-center gap-2'><Target className='h-5 w-5' /> Metas Diárias de Consumo</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <FormField control={form.control} name="calorieGoal" render={({ field }) => (
                                    <FormItem><FormLabel className='flex items-center gap-1.5'><Flame className='h-4 w-4 text-orange-500'/>Calorias (kcal)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name="proteinGoal" render={({ field }) => (
                                    <FormItem><FormLabel className='flex items-center gap-1.5'><Rocket className='h-4 w-4 text-blue-500'/>Proteínas (g)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name="hydrationGoal" render={({ field }) => (
                                    <FormItem><FormLabel className='flex items-center gap-1.5'><Droplet className='h-4 w-4 text-sky-500'/>Água (ml)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>
             <Card className="shadow-sm rounded-2xl">
                 <CardHeader>
                    <CardTitle>Planos Salvos</CardTitle>
                    <CardDescription>Gerencie seus planos gerados. Você pode salvar até 3.</CardDescription>
                </CardHeader>
                 <CardContent className="space-y-3">
                    {[0, 1, 2].map(index => {
                        const plan = savedPlans[index];
                        const isActive = userProfile?.activePlan?.name === `Plano ${index + 1}`;
                        return (
                             <Card key={index} className={cn("p-4", isActive && "border-primary bg-primary/5")}>
                                <div className="flex justify-between items-center">
                                    <div className="flex-1">
                                        <h4 className="font-semibold">{plan ? plan.name : `Slot ${index + 1} Vazio`}</h4>
                                        {plan ? (
                                            <p className="text-sm text-muted-foreground">{plan.calorieGoal} kcal | {plan.proteinGoal}g Proteína</p>
                                        ) : (
                                            <p className="text-sm text-muted-foreground">Disponível para salvar um novo plano.</p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1">
                                         {plan && (
                                            <>
                                                <Button size="icon" variant={isActive ? "default" : "outline"} onClick={() => handleActivatePlan(plan)} disabled={isSaving || isActive}>
                                                    <PlayCircle className="h-4 w-4" />
                                                </Button>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button size="icon" variant="destructive" disabled={isSaving}><Trash2 className="h-4 w-4" /></Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                                                            <AlertDialogDescription>Esta ação removerá o plano salvo neste slot. Não pode ser desfeita.</AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleDeleteSavedPlan(index)}>Remover</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </>
                                         )}
                                    </div>
                                </div>
                            </Card>
                        )
                    })}
                 </CardContent>
            </Card>
        </div>
        
        {/* Coluna da Direita: Plano Gerado */}
        <div className='w-full space-y-6'>
             <Card className="shadow-sm rounded-2xl">
                <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <CardTitle>Plano Alimentar Gerado</CardTitle>
                            <CardDescription>Revise o plano gerado pela IA e salve-o em um slot.</CardDescription>
                        </div>
                        <Button type="submit" form="goals-form" disabled={isGenerating}>
                            {isGenerating ? (<Loader2 className="mr-2 h-4 w-4 animate-spin" />) : (<Sparkles className="mr-2 h-4 w-4" />)}
                            Gerar Plano com IA
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {isGenerating ? (
                         <div className="text-center py-12 px-4 rounded-lg border-2 border-dashed min-h-[200px] flex flex-col justify-center items-center">
                            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                            <p className="font-medium text-muted-foreground">Gerando plano alimentar...</p>
                        </div>
                    ) : generatedPlan && generatedPlan.meals.length > 0 ? (
                        <div className="space-y-4">
                            {generatedPlan.meals.map((meal, index) => (
                                <div key={index} className="rounded-2xl border p-4 space-y-4 relative bg-background shadow-sm">
                                    <div className='flex justify-between items-start'>
                                        <h4 className='font-semibold text-foreground'>{meal.name}</h4>
                                        <p className='text-sm text-muted-foreground'>{meal.time}</p>
                                    </div>
                                    <p className="text-base text-muted-foreground whitespace-pre-line">{meal.items}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 px-4 rounded-lg border-2 border-dashed min-h-[200px] flex flex-col justify-center items-center">
                            <p className="font-medium text-muted-foreground">Seu plano aparecerá aqui.</p>
                            <p className="text-sm text-muted-foreground mt-1">Defina suas metas e clique em "Gerar Plano com IA".</p>
                        </div>
                    )}
                </CardContent>
            </Card>
            {generatedPlan && (
                <Card className="shadow-sm rounded-2xl">
                    <CardHeader>
                        <CardTitle>Salvar Plano Gerado</CardTitle>
                        <CardDescription>Escolha um slot para armazenar este plano.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {[0,1,2].map(index => (
                             <Button key={index} variant="outline" onClick={() => handleSavePlanToSlot(index)} disabled={isSaving}>
                                 {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <FolderDown className="mr-2 h-4 w-4"/>}
                                 Salvar no Slot {index + 1}
                            </Button>
                        ))}
                    </CardContent>
                </Card>
            )}
        </div>
    </div>
  );
}
