
// src/components/inline-add-meal-form.tsx
'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, Trash2, Loader2, Camera, AlertTriangle, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getNutritionalInfo, getNutritionalInfoFromPhoto } from '@/app/actions/meal-actions';
import { useFirestore, useUser } from '@/firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import type { MealData, MealEntry } from '@/types/meal';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { getLocalDateString } from '@/lib/date-utils';

const foodItemSchema = z.object({
  name: z.string().min(1, 'O nome do alimento é obrigatório.'),
  portion: z.coerce.number().min(0.1, 'A porção deve ser maior que 0.'),
  unit: z.string().min(1, 'A unidade é obrigatória.'),
});

const manualFormSchema = z.object({
  mealType: z.string().min(1, 'O tipo de refeição é obrigatório.'),
  foods: z.array(foodItemSchema).min(1, 'Adicione pelo menos um alimento.'),
});

const photoFormSchema = z.object({
  mealType: z.string().min(1, 'O tipo de refeição é obrigatório.'),
  photo: z.any().refine(file => file instanceof File, "Por favor, selecione uma imagem."),
});

type ManualMealFormValues = z.infer<typeof manualFormSchema>;
type PhotoMealFormValues = z.infer<typeof photoFormSchema>;

interface InlineAddMealFormProps {
  userId: string;
  onMealAdded: () => void;
  disabled?: boolean;
}

const MAX_DAILY_ANALYSIS = 3;

export default function InlineAddMealForm({ userId, onMealAdded, disabled = false }: InlineAddMealFormProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { userProfile, onProfileUpdate } = useUser();

  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState('manual');
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const todayStr = getLocalDateString();
  const dailyUploads = userProfile?.lastPhotoAnalysisDate === todayStr ? userProfile.photoAnalysisCount ?? 0 : 0;
  const isPhotoLimitReached = dailyUploads >= MAX_DAILY_ANALYSIS;

  const manualForm = useForm<ManualMealFormValues>({
    resolver: zodResolver(manualFormSchema),
    defaultValues: {
      mealType: '',
      foods: [{ name: '', portion: 100, unit: 'g' }],
    },
    disabled
  });

  const photoForm = useForm<PhotoMealFormValues>({
    resolver: zodResolver(photoFormSchema),
    defaultValues: {
      mealType: '',
      photo: null,
    },
    disabled: disabled || isPhotoLimitReached,
  });

  const { fields, append, remove } = useFieldArray({
    control: manualForm.control,
    name: 'foods',
  });

  const handleManualSubmit = async (data: ManualMealFormValues) => {
    setIsProcessing(true);
    
    try {
      const result = await getNutritionalInfo(data);
      
      const mealData: MealData = {
        alimentos: data.foods.map(f => ({ name: f.name, portion: f.portion, unit: f.unit, calorias: 0, proteinas: 0, carboidratos: 0, gorduras: 0, fibras: 0 })),
        totais: result.totals || { calorias: 0, proteinas: 0, carboidratos: 0, gorduras: 0, fibras: 0 },
      };

      if (result.error) {
        toast({ title: "Aviso de Cálculo", description: result.error, variant: "default" });
      }
      
      await saveMeal(data.mealType, mealData);
      manualForm.reset({ mealType: '', foods: [{ name: '', portion: 100, unit: 'g' }] });
      onMealAdded();

    } catch (error: any) {
      handleError(error, "Não foi possível analisar os nutrientes da sua refeição.");
    } finally {
      setIsProcessing(false);
    }
  };

  const optimizeImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 512;
                const MAX_HEIGHT = 512;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);
                
                const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                resolve(dataUrl);
            };
            img.onerror = (error) => reject(error);
        };
        reader.onerror = (error) => reject(error);
    });
  };

  const handlePhotoSubmit = async (data: PhotoMealFormValues) => {
    if (!data.photo) {
      toast({ title: "Imagem não encontrada", description: "Selecione uma imagem para continuar.", variant: "destructive" });
      return;
    }
    
    setIsProcessing(true);
    
    try {
        const optimizedImageBase64 = await optimizeImage(data.photo);
        const result = await getNutritionalInfoFromPhoto(optimizedImageBase64, data.mealType);

        if (result.error) {
            throw new Error(result.error);
        }

        const mealData: MealData = {
          alimentos: [{ 
            name: result.description || 'Análise de Foto', 
            portion: 1, 
            unit: 'un', 
            calorias: 0, proteinas: 0, carboidratos: 0, gorduras: 0, fibras: 0 
          }],
          totais: result.totals || { calorias: 0, proteinas: 0, carboidratos: 0, gorduras: 0, fibras: 0 },
        };

        if (!mealData.totais.calorias && !mealData.totais.proteinas) {
            toast({ title: "Análise Inconclusiva", description: "Não foi possível identificar os alimentos na imagem. Tente uma foto mais nítida ou insira manualmente.", variant: 'destructive' });
        } else {
            await saveMeal(data.mealType, mealData);
            await onProfileUpdate({
                lastPhotoAnalysisDate: todayStr,
                photoAnalysisCount: dailyUploads + 1,
            });
            photoForm.reset({ mealType: '', photo: undefined });
            setImagePreview(null);
            onMealAdded();
        }

    } catch (error: any) {
        handleError(error, "Falha na análise da imagem.");
    } finally {
        setIsProcessing(false);
    }
  };

  const saveMeal = async (mealType: string, mealData: MealData) => {
    if (!firestore) {
        throw new Error("Serviço de banco de dados indisponível.");
    };
    const newMealEntry: Omit<MealEntry, 'id'> = {
      userId: userId,
      date: getLocalDateString(new Date()),
      mealType: mealType,
      mealData: mealData,
      createdAt: serverTimestamp(),
    };

    const mealEntriesRef = collection(firestore, 'users', userId, 'meal_entries');
    await addDoc(mealEntriesRef, newMealEntry);
    toast({ title: "Refeição Adicionada! ✅", description: "Sua refeição foi registrada com sucesso." });
  };

  const handleError = (error: any, defaultMessage: string) => {
    console.error("Erro ao adicionar refeição:", error);
    toast({ title: "Erro ao Adicionar Refeição", description: error.message || defaultMessage, variant: "destructive" });
  }

  return (
    <div className="px-6 pb-6 border-b">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="manual">Modo Manual</TabsTrigger>
          <TabsTrigger value="photo"><Camera className="mr-2 h-4 w-4"/>Análise por Foto</TabsTrigger>
        </TabsList>
        <TabsContent value="manual" className="pt-6">
          <Form {...manualForm}>
            <form onSubmit={manualForm.handleSubmit(handleManualSubmit)} id="inline-add-meal-form" className="space-y-6">
              <FormField
                control={manualForm.control}
                name="mealType"
                render={({ field }) => (
                <FormItem>
                    <FormLabel className="font-semibold">Tipo de Refeição *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={disabled}>
                    <FormControl>
                        <SelectTrigger><SelectValue placeholder="Selecionar tipo de refeição" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        <SelectItem value="cafe-da-manha">Café da Manhã</SelectItem>
                        <SelectItem value="almoco">Almoço</SelectItem>
                        <SelectItem value="jantar">Jantar</SelectItem>
                        <SelectItem value="lanche">Lanche</SelectItem>
                    </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
                )}
              />
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Alimentos *</h3>
                  <Button type="button" variant="outline" size="sm" onClick={() => append({ name: '', portion: 100, unit: 'g' })} disabled={disabled}>
                    <Plus className="mr-2 h-4 w-4" /> Adicionar
                  </Button>
                </div>
                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <div key={field.id} className="rounded-2xl border p-4 space-y-4 relative bg-secondary/30">
                      <p className="font-semibold text-sm text-muted-foreground">Alimento {index + 1}</p>
                      {fields.length > 1 && (
                        <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => remove(index)} disabled={disabled}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                      <FormField control={manualForm.control} name={`foods.${index}.name`} render={({ field }) => (
                        <FormItem><FormLabel>Nome *</FormLabel><FormControl><Input placeholder="Ex: Peito de frango grelhado" {...field} /></FormControl><FormMessage /></FormItem>
                      )}/>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField control={manualForm.control} name={`foods.${index}.portion`} render={({ field }) => (
                          <FormItem><FormLabel>Porção *</FormLabel><FormControl><Input type="number" placeholder="Ex: 150" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <FormField control={manualForm.control} name={`foods.${index}.unit`} render={({ field }) => (
                          <FormItem><FormLabel>Unidade *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value} disabled={disabled}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Un." /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="g">g (gramas)</SelectItem>
                              <SelectItem value="ml">ml (mililitros)</SelectItem>
                              <SelectItem value="un">un (unidade)</SelectItem>
                              <SelectItem value="fatia">fatia</SelectItem>
                              <SelectItem value="xicara">xícara</SelectItem>
                              <SelectItem value="colher-sopa">colher de sopa</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage /></FormItem>
                        )}/>
                      </div>
                    </div>
                  ))}
                  {manualForm.formState.errors.foods && <FormMessage className='pt-2'>{manualForm.formState.errors.foods.message || manualForm.formState.errors.foods.root?.message}</FormMessage>}
                </div>
              </div>
              <div className='flex justify-end'>
                <Button type="submit" form="inline-add-meal-form" disabled={isProcessing || disabled}>
                  {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                  Adicionar Refeição
                </Button>
              </div>
            </form>
          </Form>
        </TabsContent>
        <TabsContent value="photo" className="pt-6">
           <Form {...photoForm}>
            <form onSubmit={photoForm.handleSubmit(handlePhotoSubmit)} className="space-y-6">
               <FormField
                control={photoForm.control}
                name="mealType"
                render={({ field }) => (
                <FormItem>
                    <FormLabel className="font-semibold">Tipo de Refeição *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={disabled || isPhotoLimitReached}>
                    <FormControl>
                        <SelectTrigger><SelectValue placeholder="Selecionar tipo de refeição" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        <SelectItem value="cafe-da-manha">Café da Manhã</SelectItem>
                        <SelectItem value="almoco">Almoço</SelectItem>
                        <SelectItem value="jantar">Jantar</SelectItem>
                        <SelectItem value="lanche">Lanche</SelectItem>
                    </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
                )}
              />

              <FormField
                control={photoForm.control}
                name="photo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Foto da Refeição *</FormLabel>
                    <FormControl>
                      <Input 
                        type="file" 
                        accept="image/*" 
                        disabled={disabled || isPhotoLimitReached}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            field.onChange(file);
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setImagePreview(reader.result as string);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {imagePreview && !isPhotoLimitReached && (
                <div className="w-full aspect-video rounded-lg overflow-hidden border">
                  <img src={imagePreview} alt="Preview da refeição" className="w-full h-full object-cover"/>
                </div>
              )}
              
              {isPhotoLimitReached ? (
                 <Alert variant="destructive">
                    <Lock className="h-4 w-4" />
                    <AlertTitle>Limite Diário Atingido</AlertTitle>
                    <AlertDescription>
                        Você já usou suas {MAX_DAILY_ANALYSIS} análises de foto por hoje. O limite será zerado amanhã.
                    </AlertDescription>
                </Alert>
              ) : (
                <Alert variant="default" className="border-primary/30 bg-primary/5">
                    <AlertTriangle className="h-4 w-4 text-primary" />
                    <AlertTitle className="text-primary">Modo Experimental</AlertTitle>
                    <AlertDescription>
                    A análise por foto é uma estimativa e pode não ser 100% precisa. ({MAX_DAILY_ANALYSIS - dailyUploads}/{MAX_DAILY_ANALYSIS} restantes hoje)
                    </AlertDescription>
                </Alert>
              )}


              <div className='flex justify-end'>
                <Button type="submit" disabled={isProcessing || disabled || isPhotoLimitReached}>
                  {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}
                  Analisar e Adicionar
                </Button>
              </div>
            </form>
          </Form>
        </TabsContent>
      </Tabs>
    </div>
  );
}
