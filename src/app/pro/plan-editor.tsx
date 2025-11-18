'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { type Room } from '@/types/room';
import { type UserProfile } from '@/types/user';
import { type PlanTemplate } from '@/types/library';
import { useToast } from '@/hooks/use-toast';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Plus, Save, Trash2, Utensils, Droplet, Flame, RotateCcw, Sparkles, BrainCircuit, Rocket, Library, Download, Target, Weight, CalendarIcon } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useFirestore } from '@/firebase';
import { doc, runTransaction, serverTimestamp, arrayUnion, getDoc, updateDoc, Timestamp, arrayRemove, collection, query, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { Separator } from '../ui/separator';
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import AIPlanConfirmationModal from '../ai-plan-confirmation-modal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { cn } from '@/lib/utils';
import { Calendar } from '../ui/calendar';
import { ptBR } from 'date-fns/locale';
import { generateMealPlanAction } from '@/app/actions/ai-actions';

const mealPlanItemSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'O tipo de refeição é obrigatório.'),
  time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:MM).'),
  items: z.string().min(3, 'Descreva os itens da refeição.'),
});

const formSchema = z.object({
  calorieGoal: z.coerce.number().positive('A meta de calorias deve ser positiva.'),
  proteinGoal: z.coerce.number().positive('A meta de proteínas deve ser positiva.'),
  hydrationGoal: z.coerce.number().positive('A meta de hidratação deve ser positiva.'),
  weight: z.coerce.number().min(1, 'O peso deve ser maior que 0.').optional().or(z.literal(NaN)),
  targetWeight: z.coerce.number().min(1, 'A meta de peso deve ser maior que 0.').optional().or(z.literal(NaN)),
  targetDate: z.date().optional(),
  meals: z.array(mealPlanItemSchema).min(0, 'Adicione pelo menos uma refeição ao plano.'),
});

type PlanEditorFormValues = z.infer<typeof formSchema>;

interface PlanEditorProps {
  room?: Room;
  userProfile?: UserProfile;
  isFeatureLocked?: boolean;
}

const defaultMealValues: Omit<z.infer<typeof mealPlanItemSchema>, 'id'> = { name: '', time: '00:00', items: '' };

const mealTypeOptions = [
    { value: 'Café da Manhã', label: 'Café da Manhã' },
    { value: 'Lanche da Manhã', label: 'Lanche da Manhã' },
    { value: 'Almoço', label: 'Almoço' },
    { value: 'Lanche da Tarde', label: 'Lanche da Tarde' },
    { value: 'Jantar', label: 'Jantar' },
    { value: 'Ceia', label: 'Ceia' },
];

export default function PlanEditor({ room, userProfile, isFeatureLocked = false }: PlanEditorProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const isProfessionalMode = !!room;
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAIModalOpen, setAIModalOpen] = useState(false);
  const [planTemplates, setPlanTemplates] = useState<PlanTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const activePlan = isProfessionalMode ? room.activePlan : userProfile?.activePlan;
  
  const calculatedProteinGoal = (calories: number) => Math.round((calories * 0.35) / 4);

  const getTargetDate = () => {
    const targetDate = isProfessionalMode ? room.patientInfo?.targetDate : userProfile?.targetDate;
    if (!targetDate) return undefined;
    return targetDate instanceof Timestamp ? targetDate.toDate() : targetDate;
  }

  const initialGoals = {
    calorieGoal: activePlan?.calorieGoal || userProfile?.calorieGoal || 2000,
    proteinGoal: activePlan?.proteinGoal || userProfile?.proteinGoal || calculatedProteinGoal(activePlan?.calorieGoal || userProfile?.calorieGoal || 2000),
    hydrationGoal: activePlan?.hydrationGoal || userProfile?.waterGoal || 2000,
    weight: (isProfessionalMode ? room.patientInfo.weight : userProfile?.weight) || NaN,
    targetWeight: (isProfessionalMode ? room.patientInfo.targetWeight : userProfile?.targetWeight) || NaN,
    targetDate: getTargetDate(),
  };


  const form = useForm<PlanEditorFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      ...initialGoals,
      meals: activePlan?.meals && activePlan.meals.length > 0 ? activePlan.meals : [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'meals',
  });
  
  useEffect(() => {
    if (activePlan) {
        const targetDate = getTargetDate();
        form.reset({
            calorieGoal: activePlan.calorieGoal,
            proteinGoal: activePlan.proteinGoal || calculatedProteinGoal(activePlan.calorieGoal),
            hydrationGoal: activePlan.hydrationGoal,
            weight: (isProfessionalMode ? room.patientInfo.weight : userProfile?.weight) || NaN,
            targetWeight: (isProfessionalMode ? room.patientInfo.targetWeight : userProfile?.targetWeight) || NaN,
            targetDate,
            meals: activePlan.meals || [],
        });
    }
  }, [activePlan, form, isProfessionalMode, room, userProfile]);


  const watchedCalorieGoal = form.watch('calorieGoal');

  useEffect(() => {
      const isCalorieGoalDirty = form.formState.dirtyFields.calorieGoal;
      if (watchedCalorieGoal > 0 && isCalorieGoalDirty) {
          const newProteinGoal = calculatedProteinGoal(watchedCalorieGoal);
          form.setValue('proteinGoal', newProteinGoal, { shouldDirty: true });
      }
  }, [watchedCalorieGoal, form]);

  useEffect(() => {
    if (!isProfessionalMode || !userProfile?.tenantId || !firestore) return;

    const templatesQuery = query(collection(firestore, 'tenants', userProfile.tenantId, 'plan_templates'));
    const unsubscribe = onSnapshot(templatesQuery, snapshot => {
      setPlanTemplates(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PlanTemplate)));
    });

    return () => unsubscribe();
  }, [isProfessionalMode, userProfile?.tenantId, firestore]);


  const { isSubmitting, isDirty } = form.formState;

  const onSubmit = async (data: PlanEditorFormValues) => {
    if (isProfessionalMode && room) {
        await handleProfessionalSubmit(data);
    } else if (userProfile) {
        await handlePatientSubmit(data);
    }
  };

  const handlePatientSubmit = async (data: PlanEditorFormValues) => {
    if (!userProfile?.id || !firestore) return;
    
    try {
        const userRef = doc(firestore, 'users', userProfile.id);
        const newActivePlan = {
            calorieGoal: data.calorieGoal,
            proteinGoal: data.proteinGoal,
            hydrationGoal: data.hydrationGoal,
            meals: data.meals,
            createdAt: serverTimestamp(),
        };

        await updateDoc(userRef, {
            activePlan: newActivePlan,
            calorieGoal: data.calorieGoal,
            proteinGoal: data.proteinGoal,
            waterGoal: data.hydrationGoal,
            weight: data.weight,
            targetWeight: data.targetWeight,
            targetDate: data.targetDate,
        });

        toast({
            title: "Plano Salvo!",
            description: `Seu plano alimentar pessoal foi salvo com sucesso.`,
        });
        form.reset(data);

    } catch (error: any) {
         toast({
            title: "Erro ao Salvar",
            description: error.message || "Não foi possível salvar seu plano.",
            variant: "destructive",
        });
    }
  }
  
  const handleProfessionalSubmit = async (data: PlanEditorFormValues) => {
     if(!room || !firestore) return;
     try {
        const roomRef = doc(firestore, 'rooms', room.id);
        const roomDoc = await getDoc(roomRef);
        if (!roomDoc.exists()) {
            throw new Error("Sala não encontrada.");
        }
        const roomData = roomDoc.data();
        const oldPlan = roomData.activePlan;

        const updatedActivePlan = {
            calorieGoal: data.calorieGoal,
            proteinGoal: data.proteinGoal,
            hydrationGoal: data.hydrationGoal,
            meals: data.meals,
            createdAt: serverTimestamp(),
        };

        await updateDoc(roomRef, {
            activePlan: updatedActivePlan,
            planHistory: arrayUnion(oldPlan),
            'patientInfo.weight': data.weight,
            'patientInfo.targetWeight': data.targetWeight,
            'patientInfo.targetDate': data.targetDate ? Timestamp.fromDate(data.targetDate) : null,
        });

        toast({
            title: "Plano Atualizado!",
            description: `O plano de ${room.patientInfo.name} foi salvo com sucesso.`,
        });
        form.reset(data);
    } catch(error: any) {
        toast({
            title: "Erro ao atualizar",
            description: error.message || "Não foi possível salvar o plano.",
            variant: "destructive",
        });
    }
  };
  
    const handleRemoveMeal = (index: number) => {
    if (!firestore) return;
    
    const mealToRemove = { ...fields[index] };
    
    remove(index);

    const dataToSave = form.getValues();
    const newMeals = dataToSave.meals.filter((_, i) => i !== index);

    if (isProfessionalMode && room) {
        const roomRef = doc(firestore, 'rooms', room.id);
        updateDoc(roomRef, { 'activePlan.meals': newMeals }).catch(error => {
            append(mealToRemove, { shouldFocus: false }); 
            toast({ title: "Erro", description: "Não foi possível remover a refeição." });
        });
    } else if (!isProfessionalMode && userProfile) {
        const userRef = doc(firestore, 'users', userProfile.id);
        updateDoc(userRef, { 'activePlan.meals': newMeals }).catch(error => {
            append(mealToRemove, { shouldFocus: false });
            toast({ title: "Erro", description: "Não foi possível remover a refeição." });
        });
    }

    toast({
        title: "Refeição Removida",
        description: "A refeição foi removida do seu plano.",
    });
  };

  const handleClearPlan = async () => {
    if (!isProfessionalMode || !room || !firestore) return;
    try {
        const roomRef = doc(firestore, 'rooms', room.id);
        const roomDoc = await getDoc(roomRef);
        if (!roomDoc.exists()) throw new Error("Sala não encontrada.");

        const roomData = roomDoc.data();
        const oldPlan = roomData.activePlan;
        
        const patientRef = doc(firestore, 'users', roomData.patientId);
        const patientDoc = await getDoc(patientRef);
        const patientData = patientDoc.exists() ? patientDoc.data() : {};

        const newActivePlan = {
          meals: [],
          calorieGoal: patientData?.calorieGoal || 2000,
          proteinGoal: patientData?.proteinGoal || 140,
          hydrationGoal: patientData?.waterGoal || 2000,
          createdAt: serverTimestamp(),
        };

        await updateDoc(roomRef, {
            activePlan: newActivePlan,
            planHistory: arrayUnion(oldPlan),
        });
        
        form.reset({
            calorieGoal: newActivePlan.calorieGoal,
            proteinGoal: newActivePlan.proteinGoal,
            hydrationGoal: newActivePlan.hydrationGoal,
            meals: [],
        });

        toast({
            title: "Plano Limpo!",
            description: "O plano alimentar foi removido. O paciente voltará a usar suas metas pessoais.",
        });

    } catch (error: any) {
        toast({
            title: "Erro ao Limpar Plano",
            description: error.message || "Não foi possível remover o plano.",
            variant: "destructive",
        });
    }
  };

  const handleConfirmAIPlan = async () => {
    setAIModalOpen(false);
    setIsGenerating(true);
    toast({
        title: "Gerando seu plano...",
        description: "Aguarde enquanto a IA prepara um plano alimentar personalizado."
    });
    
    try {
        const formValues = form.getValues();
        
        const payload = {
            calorieGoal: formValues.calorieGoal,
            proteinGoal: formValues.proteinGoal,
            hydrationGoal: formValues.hydrationGoal,
            weight: formValues.weight,
            targetWeight: formValues.targetWeight,
            targetDate: formValues.targetDate ? formValues.targetDate.toISOString().split('T')[0] : undefined,
        };

        const generatedPlan = await generateMealPlanAction(payload);
        
        const parsedPlan = formSchema.safeParse(generatedPlan);

        if (parsedPlan.success) {
            const data = parsedPlan.data;
            await onSubmit(data);
            
            toast({
                title: "Plano Gerado e Salvo!",
                description: "O novo plano foi criado e salvo.",
            });
        } else {
             console.error("Zod validation error:", parsedPlan.error);
             throw new Error('Os dados retornados pela IA não estão no formato correto.');
        }

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


    const handleApplyTemplate = () => {
        if (!selectedTemplate) return;
        const template = planTemplates.find(t => t.id === selectedTemplate);
        if (!template) return;

        form.setValue('calorieGoal', template.calorieGoal, { shouldDirty: true });
        form.setValue('proteinGoal', calculatedProteinGoal(template.calorieGoal), { shouldDirty: true });
        form.setValue('hydrationGoal', template.hydrationGoal, { shouldDirty: true });
        form.setValue('meals', template.meals, { shouldDirty: true });

        toast({
            title: "Modelo Aplicado!",
            description: `O modelo "${template.name}" foi carregado no editor.`,
        });
    };

  return (
    <>
    <div className="animate-fade-in max-w-4xl mx-auto">
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
                 <Tabs defaultValue="goals" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-6">
                        <TabsTrigger value="goals"><Target className="mr-2 h-4 w-4"/>Metas</TabsTrigger>
                        <TabsTrigger value="meals"><Utensils className="mr-2 h-4 w-4"/>Refeições</TabsTrigger>
                    </TabsList>

                    <TabsContent value="goals">
                        <Card className="shadow-sm rounded-2xl">
                            <CardHeader>
                                <CardTitle>Definição de Metas</CardTitle>
                                <CardDescription>Ajuste as metas diárias e de peso. Estes dados serão usados para gerar planos com a IA.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <h4 className='font-semibold text-foreground flex items-center gap-2'><Weight className='h-5 w-5' /> Acompanhamento de Peso</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <FormField control={form.control} name="weight" render={({ field }) => (
                                        <FormItem><FormLabel>Peso Atual (kg)</FormLabel><FormControl><Input type="number" step="0.1" placeholder="Ex: 75.5" {...field} onChange={e => field.onChange(e.target.valueAsNumber)} value={isNaN(field.value) ? '' : field.value} disabled={isFeatureLocked} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                    <FormField control={form.control} name="targetWeight" render={({ field }) => (
                                        <FormItem><FormLabel>Peso Meta (kg)</FormLabel><FormControl><Input type="number" step="0.1" placeholder="Ex: 70" {...field} onChange={e => field.onChange(e.target.valueAsNumber)} value={isNaN(field.value) ? '' : field.value} disabled={isFeatureLocked} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                </div>
                                <FormField control={form.control} name="targetDate" render={({ field }) => (
                                    <FormItem className='flex flex-col py-1'><FormLabel>Data para Atingir a Meta</FormLabel>
                                    <Popover><PopoverTrigger asChild><FormControl>
                                        <Button variant={"outline"} className={cn("pl-3 text-left font-normal",!field.value && "text-muted-foreground")} disabled={isFeatureLocked}>
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
                                        <FormItem><FormLabel className='flex items-center gap-1.5'><Flame className='h-4 w-4 text-orange-500'/>Calorias (kcal)</FormLabel><FormControl><Input type="number" {...field} disabled={isFeatureLocked} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                    <FormField control={form.control} name="proteinGoal" render={({ field }) => (
                                        <FormItem><FormLabel className='flex items-center gap-1.5'><Rocket className='h-4 w-4 text-blue-500'/>Proteínas (g)</FormLabel><FormControl><Input type="number" {...field} disabled={isFeatureLocked} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                    <FormField control={form.control} name="hydrationGoal" render={({ field }) => (
                                        <FormItem><FormLabel className='flex items-center gap-1.5'><Droplet className='h-4 w-4 text-sky-500'/>Água (ml)</FormLabel><FormControl><Input type="number" {...field} disabled={isFeatureLocked} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                </div>
                            </CardContent>
                        </Card>
                         <div className='flex justify-end pt-6'>
                            <Button type="button" onClick={() => setAIModalOpen(true)} disabled={isGenerating || isFeatureLocked}>
                                {isGenerating ? (<Loader2 className="mr-2 h-4 w-4 animate-spin" />) : (<Sparkles className="mr-2 h-4 w-4" />)}
                                Gerar Refeições com IA
                            </Button>
                        </div>
                    </TabsContent>

                    <TabsContent value="meals">
                        <Card className="shadow-sm rounded-2xl">
                             <CardHeader>
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                    <div>
                                        <CardTitle>Editor de Refeições</CardTitle>
                                        <CardDescription>Adicione, edite ou remova as refeições do plano.</CardDescription>
                                    </div>
                                    <Button type="button" variant="outline" size="sm" onClick={() => append(defaultMealValues)} disabled={isFeatureLocked}><Plus className="mr-2 h-4 w-4" /> Nova Refeição</Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {fields.length === 0 ? (
                                    <div className="text-center py-12 px-4 rounded-lg border-2 border-dashed min-h-[200px] flex flex-col justify-center items-center">
                                        <p className="font-medium text-muted-foreground">Nenhuma refeição adicionada.</p>
                                        <p className="text-sm text-muted-foreground mt-1">Clique em "Nova Refeição" ou use a IA na aba "Metas" para começar.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {fields.map((field, index) => (
                                            <div key={field.id} className="rounded-2xl border p-4 space-y-4 relative bg-background shadow-sm">
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <FormField control={form.control} name={`meals.${index}.name`} render={({ field }) => (
                                                        <FormItem><FormLabel>Tipo</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value} disabled={isFeatureLocked}><FormControl><SelectTrigger><SelectValue placeholder="Selecione um tipo" /></SelectTrigger></FormControl><SelectContent>{mealTypeOptions.map(option => (<SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>
                                                    )}/>
                                                    <FormField control={form.control} name={`meals.${index}.time`} render={({ field }) => (
                                                        <FormItem><FormLabel>Horário</FormLabel><FormControl><Input type="time" {...field} disabled={isFeatureLocked} /></FormControl><FormMessage /></FormItem>
                                                    )}/>
                                                </div>
                                                <FormField control={form.control} name={`meals.${index}.items`} render={({ field }) => (
                                                    <FormItem><FormLabel>Itens da Refeição</FormLabel><FormControl><Textarea placeholder="Ex: 2 ovos, 1 fatia de pão integral com abacate..." {...field} rows={3} disabled={isFeatureLocked} /></FormControl><FormMessage /></FormItem>
                                                )}/>
                                                {fields.length > 0 && (
                                                    <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleRemoveMeal(index)} disabled={isFeatureLocked}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        ))}
                                        {form.formState.errors.meals?.root && <FormMessage>{form.formState.errors.meals.root.message}</FormMessage>}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                        {isProfessionalMode && (
                             <Card className="mt-6 shadow-sm rounded-2xl">
                                <CardHeader>
                                     <div className="flex items-center gap-3">
                                        <div className="flex-1">
                                            <h3 className="text-lg font-semibold text-foreground">Carregar Modelo</h3>
                                            <p className="text-sm text-muted-foreground">Poupe tempo aplicando um plano da sua biblioteca.</p>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <Select onValueChange={setSelectedTemplate} disabled={planTemplates.length === 0 || isFeatureLocked}>
                                        <SelectTrigger><SelectValue placeholder="Selecione um modelo..." /></SelectTrigger>
                                        <SelectContent>{planTemplates.map(template => (<SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>))}</SelectContent>
                                    </Select>
                                     <AlertDialog><AlertDialogTrigger asChild>
                                        <Button type="button" className="w-full" disabled={!selectedTemplate || isFeatureLocked}><Download className="mr-2 h-4 w-4" /> Carregar Modelo</Button>
                                     </AlertDialogTrigger><AlertDialogContent>
                                        <AlertDialogHeader><AlertDialogTitle>Confirmar Ação</AlertDialogTitle><AlertDialogDescription>Isso substituirá as refeições atuais não salvas pelas informações do modelo selecionado. As metas não serão alteradas. Deseja continuar?</AlertDialogDescription></AlertDialogHeader>
                                        <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => {if(selectedTemplate) {const template = planTemplates.find(t=>t.id===selectedTemplate); if(template) {form.setValue('meals', template.meals, {shouldDirty: true}); toast({title: "Modelo Aplicado!", description: `As refeições do modelo "${template.name}" foram carregadas.`});}}}}>Continuar</AlertDialogAction></AlertDialogFooter>
                                     </AlertDialogContent></AlertDialog>
                                </CardContent>
                             </Card>
                         )}
                    </TabsContent>
                 </Tabs>

                <div className='flex flex-col-reverse sm:flex-row sm:justify-end sm:items-center gap-4 mt-8'>
                    {isProfessionalMode && (
                         <AlertDialog>
                            <AlertDialogTrigger asChild>
                                 <Button type="button" variant="destructive" className="mr-auto" disabled={isFeatureLocked}>
                                    <RotateCcw className="mr-2 h-4 w-4" /> Limpar Plano
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Esta ação removerá todas as refeições do plano ativo e reverterá as metas de calorias e hidratação para as definidas pelo paciente. O plano atual será salvo no histórico.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={handleClearPlan} className="bg-destructive hover:bg-destructive/90">Confirmar Limpeza</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    )}
                    
                    <Button type="submit" disabled={isSubmitting || !isDirty || isFeatureLocked}>
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Salvar Alterações
                    </Button>
                </div>
            </form>
        </Form>
    </div>
    <AIPlanConfirmationModal
        isOpen={isAIModalOpen}
        onOpenChange={setAIModalOpen}
        onConfirm={handleConfirmAIPlan}
        data={form.getValues()}
        isLoading={isGenerating}
        form={form}
    />
    </>
  );
}
