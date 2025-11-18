
// src/components/pro/plan-editor.tsx
'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { type Room } from '@/types/room';
import { type UserProfile, type ActivePlan } from '@/types/user';
import { useToast } from '@/hooks/use-toast';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, User, Weight, Target, Footprints, Shield, Salad, ChevronsRight, BrainCircuit, Save, Sparkles, Wand2, Redo } from 'lucide-react';
import { useFirestore } from '@/firebase';
import { doc, runTransaction, serverTimestamp, updateDoc, Timestamp, collection, query, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { Separator } from '../ui/separator';
import { useState, useEffect } from 'react';
import { generateMealPlanAction } from '@/app/actions/ai-actions';
import { GeneratedPlan, GeneratePlanInputSchema } from '@/lib/ai-schemas';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Checkbox } from '../ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { cn } from '@/lib/utils';
import { Calendar } from '../ui/calendar';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';


type Step = 'goals' | 'confirmation' | 'result';

const planGeneratorSchema = GeneratePlanInputSchema.extend({
    height: z.coerce.number().positive('A altura deve ser positiva.').optional(),
    age: z.coerce.number().positive('A idade deve ser positiva.').optional(),
});
type PlanGeneratorFormValues = z.infer<typeof planGeneratorSchema>;


const activityLevels = [
    { id: 'sedentary', label: 'Sedentário', description: 'Pouco ou nenhum exercício' },
    { id: 'light', label: 'Leve', description: '1-3 dias/semana' },
    { id: 'moderate', label: 'Moderado', description: '3-5 dias/semana' },
    { id: 'active', label: 'Ativo', description: '6-7 dias/semana' },
    { id: 'very_active', label: 'Muito Ativo', description: 'Trabalho físico/treino intenso' },
];

const dietaryRestrictions = [
    { id: 'vegetarian', label: 'Vegetariano' },
    { id: 'vegan', label: 'Vegano' },
    { id: 'gluten-free', label: 'Sem Glúten' },
    { id: 'lactose-free', label: 'Sem Lactose' },
    { id: 'pescetarian', label: 'Pescetariano' },
];


const FormStep = ({ form, onNext }: { form: any, onNext: () => void }) => {
    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onNext)} className="space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><User className="h-5 w-5 text-primary" /> Perfil Básico</CardTitle>
                        <CardDescription>Nos ajude a entender seu corpo e seus objetivos.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField control={form.control} name="weight" render={({ field }) => (<FormItem><FormLabel>Peso Atual (kg)</FormLabel><FormControl><Input type="number" step="0.1" placeholder="Ex: 75.5" {...field} onChange={e => field.onChange(e.target.valueAsNumber)} value={isNaN(field.value) ? '' : field.value} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="targetWeight" render={({ field }) => (<FormItem><FormLabel>Peso Meta (kg)</FormLabel><FormControl><Input type="number" step="0.1" placeholder="Ex: 70" {...field} onChange={e => field.onChange(e.target.valueAsNumber)} value={isNaN(field.value) ? '' : field.value} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="height" render={({ field }) => (<FormItem><FormLabel>Altura (cm)</FormLabel><FormControl><Input type="number" placeholder="Ex: 178" {...field} onChange={e => field.onChange(e.target.valueAsNumber)} value={isNaN(field.value) ? '' : field.value} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="age" render={({ field }) => (<FormItem><FormLabel>Idade</FormLabel><FormControl><Input type="number" placeholder="Ex: 30" {...field} onChange={e => field.onChange(e.target.valueAsNumber)} value={isNaN(field.value) ? '' : field.value} /></FormControl><FormMessage /></FormItem>)} />
                         <FormField control={form.control} name="gender" render={({ field }) => (<FormItem><FormLabel>Gênero</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex gap-4 pt-2"><FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="male" /></FormControl><FormLabel className="font-normal">Masculino</FormLabel></FormItem><FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="female" /></FormControl><FormLabel className="font-normal">Feminino</FormLabel></FormItem></RadioGroup></FormControl><FormMessage /></FormItem>)} />
                    </CardContent>
                </Card>

                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Footprints className="h-5 w-5 text-primary" /> Nível de Atividade</CardTitle>
                        <CardDescription>Como é seu nível de atividade física semanal?</CardDescription>
                    </CardHeader>
                    <CardContent>
                       <FormField control={form.control} name="activityLevel" render={({ field }) => (<FormItem><FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">{activityLevels.map(item => (<FormItem key={item.id}><FormControl><RadioGroupItem value={item.id} id={item.id} className="sr-only" /></FormControl><FormLabel htmlFor={item.id} className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer h-full"><p className="font-semibold">{item.label}</p><p className="text-xs text-muted-foreground">{item.description}</p></FormLabel></FormItem>))}</RadioGroup></FormControl><FormMessage /></FormItem>)} />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5 text-primary" /> Restrições e Preferências</CardTitle>
                        <CardDescription>Nos diga o que você não come ou o que prefere evitar.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <FormField control={form.control} name="dietaryRestrictions" render={() => (<FormItem><div className="mb-4"><FormLabel className="text-base">Restrições Alimentares</FormLabel><FormDescription>Selecione todas que se aplicam.</FormDescription></div>{dietaryRestrictions.map((item) => (<FormField key={item.id} control={form.control} name="dietaryRestrictions" render={({ field }) => {return (<FormItem key={item.id} className="flex flex-row items-start space-x-3 space-y-0"><FormControl><Checkbox checked={field.value?.includes(item.id)} onCheckedChange={(checked) => {return checked ? field.onChange([...(field.value || []), item.id]) : field.onChange(field.value?.filter((value) => value !== item.id))}}/></FormControl><FormLabel className="font-normal">{item.label}</FormLabel></FormItem>)} } />))}<FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="preferences" render={({ field }) => (<FormItem><FormLabel>Preferências ou Aversões</FormLabel><FormControl><Textarea placeholder="Ex: 'Não gosto de coentro', 'Prefiro peixe a carne vermelha', 'Gostaria de opções de café da manhã rápidas'" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    </CardContent>
                </Card>
                <div className="flex justify-end">
                    <Button type="submit">Próximo <ChevronsRight className="ml-2 h-4 w-4" /></Button>
                </div>
            </form>
        </Form>
    );
};

const ConfirmationStep = ({ data, onBack, onConfirm, isGenerating }: { data: PlanGeneratorFormValues, onBack: () => void, onConfirm: () => void, isGenerating: boolean }) => {
    
    const getLabel = (arr: {id: string, label: string}[], id?: string) => arr.find(item => item.id === id)?.label || 'Não informado';

    return (
        <div className="space-y-6">
             <Card>
                <CardHeader>
                    <CardTitle>Confirme seus Dados</CardTitle>
                    <CardDescription>Revise as informações abaixo antes de gerarmos seu plano com a IA.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <InfoItem title="Peso" value={`${data.weight || 'N/A'} kg`} />
                        <InfoItem title="Meta" value={`${data.targetWeight || 'N/A'} kg`} />
                        <InfoItem title="Altura" value={`${data.height || 'N/A'} cm`} />
                        <InfoItem title="Idade" value={`${data.age || 'N/A'} anos`} />
                    </div>
                     <InfoItem title="Nível de Atividade" value={getLabel(activityLevels, data.activityLevel)} />
                     <InfoItem title="Restrições" value={data.dietaryRestrictions && data.dietaryRestrictions.length > 0 ? data.dietaryRestrictions.map(r => getLabel(dietaryRestrictions, r)).join(', ') : 'Nenhuma'} />
                     {data.preferences && <InfoItem title="Preferências" value={data.preferences} />}

                </CardContent>
            </Card>

            <div className="flex justify-between items-center">
                <Button variant="outline" onClick={onBack}>Voltar</Button>
                <Button onClick={onConfirm} disabled={isGenerating}>
                    {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                    Gerar Plano com IA
                </Button>
            </div>
        </div>
    );
};

const InfoItem = ({title, value}: {title: string, value: string}) => (
    <div className='p-4 rounded-lg border bg-secondary/30'>
        <p className='text-sm text-muted-foreground'>{title}</p>
        <p className='font-semibold text-foreground'>{value}</p>
    </div>
);


const ResultStep = ({ plan, onSave, onRegenerate, isSaving }: { plan: GeneratedPlan, onSave: () => void, onRegenerate: () => void, isSaving: boolean }) => {
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><BrainCircuit className="h-6 w-6 text-primary" /> Plano Gerado pela IA</CardTitle>
                    <CardDescription>Este é o plano que a IA criou com base nos seus dados. Você pode salvá-lo ou gerar um novo.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                     <div className="grid grid-cols-3 gap-4">
                        <InfoItem title="Meta de Calorias" value={`${plan.calorieGoal} kcal`} />
                        <InfoItem title="Meta de Proteínas" value={`${plan.proteinGoal} g`} />
                        <InfoItem title="Meta de Hidratação" value={`${plan.hydrationGoal / 1000} L`} />
                     </div>
                     <div>
                        <h3 className="text-lg font-semibold mb-2">Refeições Sugeridas</h3>
                         <div className="space-y-3">
                             {plan.meals.map(meal => (
                                <div key={meal.name} className="p-4 border rounded-lg">
                                    <p className="font-semibold">{meal.name} <span className="text-sm text-muted-foreground font-normal">({meal.time})</span></p>
                                    <p className="text-muted-foreground whitespace-pre-line">{meal.items}</p>
                                </div>
                             ))}
                         </div>
                     </div>
                </CardContent>
            </Card>
            <div className="flex justify-between items-center">
                <Button variant="outline" onClick={onRegenerate}>
                    <Redo className="mr-2 h-4 w-4" /> Gerar Novamente
                </Button>
                <Button onClick={onSave} disabled={isSaving}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Salvar este Plano
                </Button>
            </div>
        </div>
    )
};


export default function PlanEditor({ room, userProfile }: { room?: Room; userProfile?: UserProfile; isFeatureLocked?: boolean; }) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [step, setStep] = useState<Step>('goals');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<GeneratedPlan | null>(null);

  const isProfessionalMode = !!room;
  const activePlan = isProfessionalMode ? room.activePlan : userProfile?.activePlan;

  const form = useForm<PlanGeneratorFormValues>({
    resolver: zodResolver(planGeneratorSchema),
    defaultValues: {
      weight: userProfile?.weight || undefined,
      targetWeight: userProfile?.targetWeight || undefined,
      height: userProfile?.height || undefined,
      age: userProfile?.age || undefined,
      gender: userProfile?.gender || undefined,
      activityLevel: userProfile?.activityLevel || 'moderate',
      dietaryRestrictions: userProfile?.dietaryRestrictions || [],
      preferences: userProfile?.preferences || '',
    },
  });

  useEffect(() => {
    if (userProfile) {
        form.reset({
            weight: userProfile.weight || undefined,
            targetWeight: userProfile.targetWeight || undefined,
            height: userProfile.height || undefined,
            age: userProfile.age || undefined,
            gender: userProfile.gender || undefined,
            activityLevel: userProfile.activityLevel || 'moderate',
            dietaryRestrictions: userProfile.dietaryRestrictions || [],
            preferences: userProfile.preferences || '',
        })
    }
  }, [userProfile, form]);
  

  const handleNextStep = () => setStep('confirmation');

  const handleGeneratePlan = async () => {
    setIsGenerating(true);
    try {
        const data = form.getValues();
        const plan = await generateMealPlanAction(data);
        setGeneratedPlan(plan);
        setStep('result');
    } catch(error: any) {
        toast({ title: "Erro ao Gerar Plano", description: error.message, variant: "destructive" });
        setStep('goals');
    } finally {
        setIsGenerating(false);
    }
  }
  
  const handleSavePlan = async () => {
    if (!generatedPlan || !userProfile?.id || !firestore) return;

    setIsSaving(true);
    try {
      const userRef = doc(firestore, 'users', userProfile.id);
      
      // Salva os dados do formulário no perfil do usuário
      const profileData = form.getValues();
      await updateDoc(userRef, { ...profileData });
      
      // Salva o plano gerado como plano ativo
      const newActivePlan: ActivePlan = {
          name: 'Plano Gerado por IA',
          ...generatedPlan,
          createdAt: serverTimestamp(),
      };

      await updateDoc(userRef, { activePlan: newActivePlan });

      toast({
          title: "Plano Salvo!",
          description: `Seu novo plano alimentar foi salvo e ativado.`,
      });
      setStep('goals'); // Volta para a primeira etapa

    } catch (error: any) {
         toast({
            title: "Erro ao Salvar",
            description: error.message || "Não foi possível salvar seu plano.",
            variant: "destructive",
        });
    } finally {
        setIsSaving(false);
    }
  };


  const renderStep = () => {
    switch (step) {
        case 'goals':
            return <FormStep form={form} onNext={handleNextStep} />;
        case 'confirmation':
            return <ConfirmationStep data={form.getValues()} onBack={() => setStep('goals')} onConfirm={handleGeneratePlan} isGenerating={isGenerating} />;
        case 'result':
            if (generatedPlan) {
                return <ResultStep plan={generatedPlan} onSave={handleSavePlan} onRegenerate={handleGeneratePlan} isSaving={isSaving} />;
            }
            return null; // ou um estado de erro
        default:
            return <FormStep form={form} onNext={handleNextStep} />;
    }
  }


  return (
    <div className="animate-fade-in max-w-4xl mx-auto">
        <div className="mb-8 text-center">
            <div className="inline-flex items-center justify-center bg-primary/10 text-primary rounded-full p-3 mb-3">
                <Wand2 className="h-7 w-7" />
            </div>
            <h2 className="text-3xl font-bold text-foreground font-heading">Assistente de Plano IA</h2>
            <p className="text-muted-foreground mt-1 max-w-2xl mx-auto">Siga as etapas para que nossa inteligência artificial crie o plano alimentar perfeito para você.</p>
        </div>
        {renderStep()}
    </div>
  );
}
