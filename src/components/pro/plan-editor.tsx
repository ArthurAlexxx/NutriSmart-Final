
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Loader2, User, Shield, Footprints, ChevronsRight, Sparkles, Wand2, ChevronsLeft, Save } from 'lucide-react';
import { useFirestore } from '@/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Separator } from '../ui/separator';
import { useState, useEffect } from 'react';
import { generateMealPlanAction } from '@/app/actions/ai-actions';
import { GeneratedPlan, GeneratePlanInputSchema } from '@/lib/ai-schemas';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Checkbox } from '../ui/checkbox';
import { cn } from '@/lib/utils';


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

const allergyOptions = [
    { id: 'peanuts', label: 'Amendoim' },
    { id: 'shellfish', label: 'Frutos do mar' },
    { id: 'milk', label: 'Leite' },
    { id: 'eggs', label: 'Ovos' },
    { id: 'fish', label: 'Peixe' },
    { id: 'soy', label: 'Soja' },
    { id: 'nuts', label: 'Nozes' },
];


const FormStep = ({ form, onNext }: { form: any, onNext: () => void }) => {
    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onNext)} id="plan-generator-form" className="space-y-8">
                <section>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><User className="h-5 w-5 text-primary" /> Perfil Básico</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField control={form.control} name="weight" render={({ field }) => (<FormItem><FormLabel>Peso Atual (kg)</FormLabel><FormControl><Input type="number" step="0.1" placeholder="Ex: 75.5" {...field} onChange={e => field.onChange(e.target.valueAsNumber)} value={isNaN(field.value) ? '' : field.value} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="targetWeight" render={({ field }) => (<FormItem><FormLabel>Peso Meta (kg)</FormLabel><FormControl><Input type="number" step="0.1" placeholder="Ex: 70" {...field} onChange={e => field.onChange(e.target.valueAsNumber)} value={isNaN(field.value) ? '' : field.value} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="height" render={({ field }) => (<FormItem><FormLabel>Altura (cm)</FormLabel><FormControl><Input type="number" placeholder="Ex: 178" {...field} onChange={e => field.onChange(e.target.valueAsNumber)} value={isNaN(field.value) ? '' : field.value} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="age" render={({ field }) => (<FormItem><FormLabel>Idade</FormLabel><FormControl><Input type="number" placeholder="Ex: 30" {...field} onChange={e => field.onChange(e.target.valueAsNumber)} value={isNaN(field.value) ? '' : field.value} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="gender" render={({ field }) => (<FormItem><FormLabel>Gênero</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex gap-4 pt-2"><FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="male" /></FormControl><FormLabel className="font-normal">Masculino</FormLabel></FormItem><FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="female" /></FormControl><FormLabel className="font-normal">Feminino</FormLabel></FormItem></RadioGroup></FormControl><FormMessage /></FormItem>)} />
                    </div>
                </section>
                <Separator />
                <section>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Footprints className="h-5 w-5 text-primary" /> Nível de Atividade Semanal</h3>
                    <FormField
                        control={form.control}
                        name="activityLevel"
                        render={({ field }) => (
                            <FormItem>
                                <FormControl>
                                    <RadioGroup
                                        onValueChange={field.onChange}
                                        value={field.value}
                                        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4"
                                    >
                                        {activityLevels.map((item) => (
                                            <FormItem key={item.id}>
                                                <FormControl>
                                                    <RadioGroupItem value={item.id} id={item.id} className="sr-only" />
                                                </FormControl>
                                                <FormLabel
                                                    htmlFor={item.id}
                                                    className={cn(
                                                        "flex flex-col items-center text-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer h-full transition-colors",
                                                        field.value === item.id && "border-primary bg-primary/5"
                                                    )}
                                                >
                                                    <p className="font-semibold">{item.label}</p>
                                                    <p className="text-xs text-muted-foreground">{item.description}</p>
                                                </FormLabel>
                                            </FormItem>
                                        ))}
                                    </RadioGroup>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </section>
                <Separator />
                <section>
                     <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Shield className="h-5 w-5 text-primary" /> Restrições e Preferências</h3>
                     <div className="space-y-6">
                        <FormField control={form.control} name="dietaryRestrictions" render={() => (<FormItem><div><FormLabel className="text-base">Restrições Alimentares</FormLabel><FormDescription>Selecione todas as dietas que você segue.</FormDescription></div><div className='grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2'>{dietaryRestrictions.map((item) => (<FormField key={`diet-${item.id}`} control={form.control} name="dietaryRestrictions" render={({ field }) => {return (<FormItem className="flex flex-row items-center space-x-2 space-y-0 rounded-md border p-3 bg-secondary/30"><FormControl><Checkbox checked={field.value?.includes(item.id)} onCheckedChange={(checked) => {return checked ? field.onChange([...(field.value || []), item.id]) : field.onChange(field.value?.filter((value) => value !== item.id))}}/></FormControl><FormLabel className="font-normal text-sm">{item.label}</FormLabel></FormItem>)} } />))}</div><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="allergies" render={() => (<FormItem><div><FormLabel className="text-base">Alergias</FormLabel><FormDescription>Selecione ingredientes aos quais você é alérgico.</FormDescription></div><div className='grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2'>{allergyOptions.map((item) => (<FormField key={`allergy-${item.id}`} control={form.control} name="allergies" render={({ field }) => {return (<FormItem className="flex flex-row items-center space-x-2 space-y-0 rounded-md border p-3 bg-secondary/30"><FormControl><Checkbox checked={field.value?.includes(item.id)} onCheckedChange={(checked) => {return checked ? field.onChange([...(field.value || []), item.id]) : field.onChange(field.value?.filter((value) => value !== item.id))}}/></FormControl><FormLabel className="font-normal text-sm">{item.label}</FormLabel></FormItem>)} } />))}</div><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="preferences" render={({ field }) => (<FormItem><FormLabel>Preferências ou Aversões</FormLabel><FormControl><Textarea placeholder="Ex: 'Não gosto de coentro', 'Prefiro peixe a carne vermelha', 'Gostaria de opções de café da manhã rápidas'" {...field} /></FormControl><FormMessage /></FormItem>)} />
                     </div>
                </section>
            </form>
        </Form>
    );
};

const ConfirmationStep = ({ data }: { data: PlanGeneratorFormValues }) => {
    
    const getLabel = (arr: {id: string, label: string}[], id?: string) => arr.find(item => item.id === id)?.label || 'Não informado';

    const renderList = (items: string[] | undefined, options: {id: string, label: string}[], defaultText: string) => {
        if (!items || items.length === 0) return defaultText;
        return items.map(item => getLabel(options, item)).join(', ');
    }

    return (
        <div className="space-y-4">
            <InfoItem title="Peso" value={`${data.weight || 'N/A'} kg`} />
            <InfoItem title="Meta de Peso" value={`${data.targetWeight || 'N/A'} kg`} />
            <InfoItem title="Altura" value={`${data.height || 'N/A'} cm`} />
            <InfoItem title="Idade" value={`${data.age || 'N/A'} anos`} />
            <InfoItem title="Nível de Atividade" value={getLabel(activityLevels, data.activityLevel)} />
            <InfoItem title="Restrições" value={renderList(data.dietaryRestrictions, dietaryRestrictions, 'Nenhuma')} />
            <InfoItem title="Alergias" value={renderList(data.allergies, allergyOptions, 'Nenhuma')} />
            {data.preferences && <InfoItem title="Preferências" value={data.preferences} />}
        </div>
    );
};

const InfoItem = ({title, value}: {title: string, value: string}) => (
    <div className='p-4 rounded-lg border bg-secondary/30'>
        <p className='text-sm text-muted-foreground'>{title}</p>
        <p className='font-semibold text-foreground'>{value}</p>
    </div>
);


const ResultStep = ({ plan }: { plan: GeneratedPlan }) => {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
                <InfoItem title="Meta de Calorias" value={`${plan.calorieGoal} kcal`} />
                <InfoItem title="Meta de Proteínas" value={`${plan.proteinGoal} g`} />
                <InfoItem title="Meta de Hidratação" value={`${plan.hydrationGoal / 1000} L`} />
            </div>
            <div>
                <h3 className="text-lg font-semibold mb-2">Refeições Sugeridas</h3>
                <div className="space-y-3">
                    {plan.meals.map(meal => (
                        <div key={meal.name} className="p-4 border rounded-lg bg-secondary/30">
                            <p className="font-semibold">{meal.name} <span className="text-sm text-muted-foreground font-normal">({meal.time})</span></p>
                            <p className="text-muted-foreground whitespace-pre-line">{meal.items}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
};


export default function PlanEditor({ userProfile }: { userProfile: UserProfile; }) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [step, setStep] = useState<Step>('goals');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<GeneratedPlan | null>(null);

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
      allergies: userProfile?.allergies || [],
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
            allergies: userProfile.allergies || [],
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
      
      const profileData = form.getValues();
      await updateDoc(userRef, { ...profileData });
      
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
      setStep('goals');

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


  const stepTitles = {
      goals: { title: "Assistente de Plano IA", description: "Siga as etapas para que nossa IA crie o plano alimentar perfeito para você." },
      confirmation: { title: "Confirme seus Dados", description: "Revise as informações antes de gerarmos seu plano." },
      result: { title: "Plano Gerado pela IA", description: "Este é o plano que a IA criou. Você pode salvá-lo ou gerar um novo." },
  }

  const currentStepInfo = stepTitles[step];


  return (
    <div className="animate-fade-in max-w-4xl mx-auto">
        <Card>
            <CardHeader className="text-center">
                <div className="inline-flex items-center justify-center bg-primary/10 text-primary rounded-full p-3 mb-3 mx-auto w-fit">
                    <Wand2 className="h-7 w-7" />
                </div>
                <CardTitle className="text-3xl font-bold font-heading">{currentStepInfo.title}</CardTitle>
                <CardDescription className="max-w-2xl mx-auto">{currentStepInfo.description}</CardDescription>
            </CardHeader>
            <CardContent>
                {step === 'goals' && <FormStep form={form} onNext={handleNextStep} />}
                {step === 'confirmation' && <ConfirmationStep data={form.getValues()} />}
                {step === 'result' && generatedPlan && <ResultStep plan={generatedPlan} />}
            </CardContent>
            <CardFooter className="flex justify-between items-center border-t pt-6">
                <div>
                   {step !== 'goals' && (
                        <Button variant="outline" onClick={() => setStep(step === 'result' ? 'confirmation' : 'goals')} disabled={isGenerating || isSaving}>
                             <ChevronsLeft className="mr-2 h-4 w-4" /> Voltar
                        </Button>
                   )}
                </div>
                <div>
                    {step === 'goals' && <Button type="submit" form="plan-generator-form">Próximo <ChevronsRight className="ml-2 h-4 w-4" /></Button>}
                    {step === 'confirmation' && (
                        <Button onClick={handleGeneratePlan} disabled={isGenerating}>
                            {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                            Gerar Plano com IA
                        </Button>
                    )}
                    {step === 'result' && (
                         <div className="flex gap-2">
                             <Button variant="outline" onClick={() => setStep('confirmation')} disabled={isSaving}>Gerar Novamente</Button>
                             <Button onClick={handleSavePlan} disabled={isSaving}>
                                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                Salvar Plano
                            </Button>
                         </div>
                    )}
                </div>
            </CardFooter>
        </Card>
    </div>
  );
}
