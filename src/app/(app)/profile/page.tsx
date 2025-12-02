// src/app/(app)/profile/page.tsx
'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Save, User as UserIcon, Share2, CreditCard, Copy, LogOut, AlarmClock, XCircle, ShieldAlert, PauseCircle, Trash2, Mail, Camera, Download, Target, Weight, CalendarIcon, Flame, Droplet, Rocket } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { UserProfile } from '@/types/user';
import { useAuth, useUser } from '@/firebase';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { signOut, EmailAuthProvider, reauthenticateWithCredential, updateEmail, updateProfile } from 'firebase/auth';
import { useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { differenceInDays, differenceInHours, format } from 'date-fns';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Separator } from '@/components/ui/separator';
import { usePWA } from '@/context/pwa-context';
import AppLayout from '@/components/app-layout';
import { PageHeader } from '@/components/page-header';
import { Timestamp, doc, writeBatch, collection, serverTimestamp } from 'firebase/firestore';
import { getLocalDateString } from '@/lib/date-utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { ptBR } from 'date-fns/locale';

const profileFormSchema = z.object({
  fullName: z.string().min(3, 'O nome deve ter pelo menos 3 caracteres.'),
  phone: z.string().min(10, 'O celular é obrigatório.').optional(),
  taxId: z.string().min(11, 'O CPF/CNPJ é obrigatório.').optional(),
  postalCode: z.string().min(8, "CEP inválido.").optional(),
  address: z.string().min(3, "Endereço inválido.").optional(),
  addressNumber: z.string().min(1, "Número inválido.").optional(),
  complement: z.string().optional(),
  province: z.string().min(2, "Bairro inválido.").optional(),
});
type ProfileFormValues = z.infer<typeof profileFormSchema>;

const goalsFormSchema = z.object({
  weight: z.coerce.number().min(1, 'O peso deve ser maior que 0.').optional().or(z.literal(NaN)),
  targetWeight: z.coerce.number().min(1, 'A meta de peso deve ser maior que 0.').optional().or(z.literal(NaN)),
  targetDate: z.date().optional(),
  calorieGoal: z.coerce.number().min(1, 'A meta de calorias deve ser maior que 0.'),
  proteinGoal: z.coerce.number().min(1, 'A meta de proteínas deve ser maior que 0.'),
  waterGoal: z.coerce.number().min(1, 'A meta de água deve ser maior que 0.'),
});
type GoalsFormValues = z.infer<typeof goalsFormSchema>;

type NavItem = 'personal' | 'goals' | 'sharing' | 'subscription' | 'install';


const NavButton = ({ active, onClick, icon: Icon, label, variant = 'ghost' }: { active: boolean, onClick: () => void, icon: React.ElementType, label: string, variant?: 'ghost' | 'destructive' }) => (
    <Button
        variant={active ? 'secondary' : variant}
        onClick={onClick}
        className={cn(
            "w-full justify-start gap-3",
            variant === 'destructive' && (active ? 'bg-destructive/80 text-destructive-foreground' : 'text-destructive hover:bg-destructive/10 hover:text-destructive')
        )}
    >
        <Icon className="h-5 w-5" />
        <span>{label}</span>
    </Button>
);


export default function ProfilePage() {
    const { toast } = useToast();
    const { user, userProfile, onProfileUpdate, effectiveSubscriptionStatus, isAdmin, firestore } = useUser();
    const auth = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();

    const initialTab = searchParams.get('tab') === 'goals' ? 'goals' : 'personal';
    const [activeTab, setActiveTab] = useState<NavItem>(initialTab);

    const [isCopied, setIsCopied] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isCancelling, setIsCancelling] = useState(false);
    const { canInstall, triggerInstall, isPWA } = usePWA();
    

    const profileForm = useForm<ProfileFormValues>({
        resolver: zodResolver(profileFormSchema),
    });

    const goalsForm = useForm<GoalsFormValues>({
        resolver: zodResolver(goalsFormSchema),
    });
    
    const { isSubmitting: isProfileSubmitting, formState: { isDirty: isProfileDirty } } = profileForm;
    const { isSubmitting: isGoalsSubmitting, formState: { isDirty: isGoalsDirty } } = goalsForm;


    useEffect(() => {
        if (userProfile) {
            profileForm.reset({
                fullName: userProfile.fullName || '',
                phone: userProfile.phone || '',
                taxId: userProfile.taxId || '',
                postalCode: userProfile.postalCode || '',
                address: userProfile.address || '',
                addressNumber: userProfile.addressNumber || '',
                complement: userProfile.complement || '',
                province: userProfile.province || '',
            });

            const targetDate = userProfile.targetDate;
            let finalDate: Date | undefined;
            if (targetDate) {
                if (typeof (targetDate as any)?.toDate === 'function') {
                    finalDate = (targetDate as Timestamp).toDate();
                } else if (targetDate instanceof Date) {
                    finalDate = targetDate;
                }
            }

             goalsForm.reset({
                calorieGoal: userProfile.calorieGoal ?? 2000,
                proteinGoal: userProfile.proteinGoal ?? 140,
                waterGoal: userProfile.waterGoal ?? 2000,
                weight: userProfile.weight || '',
                targetWeight: userProfile.targetWeight || '',
                targetDate: finalDate,
            });
        }
    }, [userProfile, profileForm, goalsForm]);
    
    const watchedCalorieGoal = goalsForm.watch('calorieGoal');

    useEffect(() => {
        if (watchedCalorieGoal > 0 && goalsForm.formState.dirtyFields.calorieGoal) {
            const newProteinGoal = Math.round((watchedCalorieGoal * 0.35) / 4);
            goalsForm.setValue('proteinGoal', newProteinGoal, { shouldDirty: true });
        }
    }, [watchedCalorieGoal, goalsForm]);


    if (!user || !userProfile) {
        return (
            <AppLayout user={user} userProfile={userProfile} onProfileUpdate={() => {}}>
                <div className="flex h-full items-center justify-center">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                </div>
            </AppLayout>
        )
    }

    const onProfileSubmit = async (data: ProfileFormValues) => {
        if (!isProfileDirty && !selectedImage) {
            return;
        }
        
        setIsUploading(true);

        try {
            let photoURL: string | undefined = undefined;

            if (selectedImage && auth.currentUser) {
                const storage = getStorage();
                const storageRef = ref(storage, `profile-pictures/${auth.currentUser.uid}/profile.jpg`);
                await uploadBytes(storageRef, selectedImage);
                photoURL = await getDownloadURL(storageRef);
            }

            const updatedProfile: Partial<UserProfile> = {};
            if (isProfileDirty) {
                if (profileForm.formState.dirtyFields.fullName) updatedProfile.fullName = data.fullName;
                if (profileForm.formState.dirtyFields.phone) updatedProfile.phone = data.phone;
                if (profileForm.formState.dirtyFields.taxId) updatedProfile.taxId = data.taxId;
                if (profileForm.formState.dirtyFields.postalCode) updatedProfile.postalCode = data.postalCode;
                if (profileForm.formState.dirtyFields.address) updatedProfile.address = data.address;
                if (profileForm.formState.dirtyFields.addressNumber) updatedProfile.addressNumber = data.addressNumber;
                if (profileForm.formState.dirtyFields.complement) updatedProfile.complement = data.complement;
                if (profileForm.formState.dirtyFields.province) updatedProfile.province = data.province;
            }

            if (photoURL) {
                updatedProfile.photoURL = photoURL;
            }
            
            if (Object.keys(updatedProfile).length > 0) {
                await onProfileUpdate(updatedProfile);
                if (auth.currentUser) {
                    const authProfileUpdate: { displayName?: string; photoURL?: string } = {};
                    if (updatedProfile.fullName) authProfileUpdate.displayName = updatedProfile.fullName;
                    if (updatedProfile.photoURL) authProfileUpdate.photoURL = updatedProfile.photoURL;
                    if (Object.keys(authProfileUpdate).length > 0) {
                        await updateProfile(auth.currentUser, authProfileUpdate);
                    }
                }
            }
            
            toast({
                title: 'Perfil Atualizado',
                description: 'Seus dados foram salvos com sucesso.',
            });

        } catch (error: any) {
            toast({
                title: 'Erro ao Salvar',
                description: error.message || 'Não foi possível atualizar seus dados.',
                variant: 'destructive',
            });
        } finally {
            setIsUploading(false);
            setSelectedImage(null);
            setImagePreview(null);
        }
    };

    const onGoalsSubmit = async (data: GoalsFormValues) => {
        if (!firestore || !isGoalsDirty) {
            return;
        }

        try {
            const batch = writeBatch(firestore);
            const userRef = doc(firestore, 'users', user.uid);
            const updatedProfile: Partial<UserProfile> = {};
            const dirtyFields = goalsForm.formState.dirtyFields;

            if (dirtyFields.calorieGoal) updatedProfile.calorieGoal = data.calorieGoal;
            if (dirtyFields.proteinGoal) updatedProfile.proteinGoal = data.proteinGoal;
            if (dirtyFields.waterGoal) updatedProfile.waterGoal = data.waterGoal;
            if (dirtyFields.weight && data.weight && !isNaN(data.weight)) updatedProfile.weight = data.weight;
            if (dirtyFields.targetWeight && data.targetWeight && !isNaN(data.targetWeight)) updatedProfile.targetWeight = data.targetWeight;
            if (dirtyFields.targetDate && data.targetDate) updatedProfile.targetDate = Timestamp.fromDate(data.targetDate);
            
            batch.update(userRef, updatedProfile);

            if (dirtyFields.weight && updatedProfile.weight) {
                const weightLogRef = doc(collection(firestore, 'users', user.uid, 'weight_logs'));
                const newLog = {
                    userId: user.uid,
                    weight: updatedProfile.weight,
                    date: getLocalDateString(new Date()),
                    createdAt: serverTimestamp(),
                };
                batch.set(weightLogRef, newLog);
            }

            if (userProfile.patientRoomId && (dirtyFields.weight)) {
                const roomRef = doc(firestore, 'rooms', userProfile.patientRoomId);
                const updatedPatientInfo: { [key: string]: any } = {};
                if (dirtyFields.weight && updatedProfile.weight) {
                    updatedPatientInfo['patientInfo.weight'] = updatedProfile.weight;
                }
                
                if (Object.keys(updatedPatientInfo).length > 0) {
                    batch.update(roomRef, updatedPatientInfo);
                }
            }
            await batch.commit();
            
            toast({
                title: 'Metas Salvas',
                description: 'Suas metas foram atualizadas com sucesso.',
            });

        } catch (error: any) {
            console.error("Error updating goals:", error);
            toast({
                title: 'Erro ao Salvar Metas',
                description: error.message || 'Não foi possível atualizar suas metas. Tente novamente.',
                variant: 'destructive',
            });
        }
    };


    const handleCopyCode = () => {
        if (!userProfile.dashboardShareCode) return;
        navigator.clipboard.writeText(userProfile.dashboardShareCode);
        setIsCopied(true);
        toast({ title: 'Código Copiado!', description: 'Você pode enviar este código para seu nutricionista.'});
        setTimeout(() => setIsCopied(false), 3000);
    };

    const handlePhotoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setSelectedImage(file);
        setImagePreview(URL.createObjectURL(file));
    };
    
    const handleCancelSubscription = async () => {
        if (!auth.currentUser) return;
        setIsCancelling(true);
        try {
            const token = await auth.currentUser.getIdToken();
            const response = await fetch('/api/billing/cancel', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
            });
            
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'Falha ao cancelar a assinatura.');
            }

            toast({
                title: 'Assinatura Cancelada',
                description: 'Seu plano foi alterado para o gratuito. Você pode assinar novamente a qualquer momento.',
            });

        } catch (error: any) {
            toast({ title: 'Erro', description: error.message, variant: 'destructive' });
        } finally {
            setIsCancelling(false);
        }
    };


    const expiryDate = useMemo(() => {
        if (!userProfile?.subscriptionExpiresAt) return null;
        return (userProfile.subscriptionExpiresAt as any).toDate();
    }, [userProfile]);

    const countdown = useMemo(() => {
        if (!expiryDate || expiryDate < new Date()) return null;

        const now = new Date();
        const daysLeft = differenceInDays(expiryDate, now);
        const hoursLeft = differenceInHours(expiryDate, now) % 24;

        if (daysLeft > 0) {
        return `${daysLeft}d ${hoursLeft}h restantes`;
        }
        if (hoursLeft > 0) {
        return `${hoursLeft}h restantes`;
        }
        return 'Expirando em breve';
    }, [expiryDate]);
    
    const isProfessionalUser = effectiveSubscriptionStatus === 'professional';

    const navItems = [
        { id: 'personal', label: 'Dados Pessoais', icon: UserIcon, visible: true },
        { id: 'goals', label: 'Minhas Metas', icon: Target, visible: true },
        { id: 'sharing', label: 'Compartilhamento', icon: Share2, visible: !isProfessionalUser && !isAdmin },
        { id: 'subscription', label: 'Assinatura', icon: CreditCard, visible: !isAdmin },
        { id: 'install', label: 'Instalar App', icon: Download, visible: canInstall && !isPWA },
    ].filter(item => item.visible);
    
    const currentAvatarSrc = imagePreview || userProfile?.photoURL || '';

    const renderContent = () => {
        switch(activeTab) {
            case 'personal':
                return (
                    <Card className="w-full shadow-none border-none">
                        <Form {...profileForm}>
                            <form onSubmit={profileForm.handleSubmit(onProfileSubmit)}>
                                <CardHeader>
                                    <CardTitle>Dados Pessoais</CardTitle>
                                    <CardDescription>Mantenha seus dados de contato e identificação atualizados.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className='flex flex-col sm:flex-row items-center gap-6'>
                                        <div className='relative group'>
                                            <Avatar className="h-24 w-24 border-2 border-primary/20">
                                                <AvatarImage src={currentAvatarSrc} alt={userProfile?.fullName} />
                                                <AvatarFallback>
                                                    <UserIcon className="h-10 w-10 text-muted-foreground" />
                                                </AvatarFallback>
                                            </Avatar>
                                            <Button 
                                                type="button" 
                                                variant="outline" 
                                                size="icon"
                                                className='absolute -bottom-2 -right-2 rounded-full h-9 w-9 bg-background group-hover:bg-secondary'
                                                onClick={() => fileInputRef.current?.click()}
                                                disabled={isUploading || isProfileSubmitting}
                                            >
                                                {(isUploading || isProfileSubmitting) && selectedImage ? <Loader2 className='h-4 w-4 animate-spin' /> : <Camera className="h-4 w-4"/>}
                                            </Button>
                                            <input 
                                                type="file" 
                                                ref={fileInputRef} 
                                                className="hidden" 
                                                accept="image/png, image/jpeg"
                                                onChange={handlePhotoSelect}
                                            />
                                        </div>
                                        <div className="flex-1 w-full">
                                            <FormField control={profileForm.control} name="fullName" render={({ field }) => (
                                                <FormItem><FormLabel>Nome Completo *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                            )}/>
                                        </div>
                                    </div>
                                    <Separator className="my-4" />
                                    <p className="text-sm font-medium">Informações de Contato e Cobrança</p>
                                    <FormField control={profileForm.control} name="phone" render={({ field }) => (
                                        <FormItem><FormLabel>Celular</FormLabel><FormControl><Input placeholder="(XX) XXXXX-XXXX" {...field} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                    <FormField control={profileForm.control} name="taxId" render={({ field }) => (
                                        <FormItem><FormLabel>CPF/CNPJ</FormLabel><FormControl><Input placeholder="Seu CPF ou CNPJ" {...field} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                    <FormField control={profileForm.control} name="postalCode" render={({ field }) => (
                                        <FormItem><FormLabel>CEP</FormLabel><FormControl><Input placeholder="00000-000" {...field} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                    <FormField control={profileForm.control} name="address" render={({ field }) => (
                                        <FormItem><FormLabel>Endereço</FormLabel><FormControl><Input placeholder="Rua, Av..." {...field} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                    <div className="grid grid-cols-3 gap-4">
                                        <FormField control={profileForm.control} name="addressNumber" render={({ field }) => (
                                            <FormItem className="col-span-1"><FormLabel>Nº</FormLabel><FormControl><Input placeholder="123" {...field} /></FormControl><FormMessage /></FormItem>
                                        )}/>
                                        <FormField control={profileForm.control} name="complement" render={({ field }) => (
                                            <FormItem className="col-span-2"><FormLabel>Comp.</FormLabel><FormControl><Input placeholder="Apto, Bloco..." {...field} /></FormControl><FormMessage /></FormItem>
                                        )}/>
                                    </div>
                                    <FormField control={profileForm.control} name="province" render={({ field }) => (
                                        <FormItem><FormLabel>Bairro</FormLabel><FormControl><Input placeholder="Seu bairro" {...field} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                </CardContent>
                                <CardFooter>
                                    <Button type="submit" disabled={isProfileSubmitting || isUploading || (!isProfileDirty && !selectedImage)}>
                                        {(isProfileSubmitting || isUploading) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                        Salvar Alterações
                                    </Button>
                                </CardFooter>
                            </form>
                        </Form>
                    </Card>
                );
            case 'goals':
                 return (
                    <Card className="w-full shadow-none border-none">
                        <Form {...goalsForm}>
                            <form onSubmit={goalsForm.handleSubmit(onGoalsSubmit)}>
                                <CardHeader>
                                    <CardTitle>Ajustar Metas de Saúde</CardTitle>
                                    <CardDescription>Atualize seu peso e metas diárias para uma experiência mais precisa.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-8">
                                    <div>
                                        <h3 className="font-semibold text-foreground mb-4">Metas de Peso</h3>
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <FormField control={goalsForm.control} name="weight" render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Peso Atual (kg)</FormLabel>
                                                        <FormControl><Input type="number" step="0.1" placeholder="Seu peso atual" {...field} onChange={e => field.onChange(e.target.valueAsNumber)} value={field.value || ''} /></FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}/>
                                                <FormField control={goalsForm.control} name="targetWeight" render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Peso Meta (kg)</FormLabel>
                                                        <FormControl><Input type="number" step="0.1" placeholder="Seu peso desejado" {...field} onChange={e => field.onChange(e.target.valueAsNumber)} value={field.value || ''} /></FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}/>
                                            </div>
                                            <FormField control={goalsForm.control} name="targetDate" render={({ field }) => (
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
                                        </div>
                                    </div>
                                     <div>
                                        <h3 className="font-semibold text-foreground mb-4">Metas Nutricionais Diárias</h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                             <FormField control={goalsForm.control} name="calorieGoal" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className='flex items-center gap-1.5'><Flame className='h-4 w-4 text-orange-500'/>Calorias (kcal)</FormLabel>
                                                    <FormControl><Input type="number" placeholder="Ex: 2200" {...field} /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}/>
                                            <FormField control={goalsForm.control} name="proteinGoal" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className='flex items-center gap-1.5'><Rocket className='h-4 w-4 text-blue-500'/>Proteínas (g)</FormLabel>
                                                    <FormControl><Input type="number" placeholder="Ex: 150" {...field} /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}/>
                                            <FormField control={goalsForm.control} name="waterGoal" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className='flex items-center gap-1.5'><Droplet className='h-4 w-4 text-sky-500'/>Água (ml)</FormLabel>
                                                    <FormControl><Input type="number" placeholder="Ex: 2000" {...field} /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}/>
                                        </div>
                                     </div>
                                </CardContent>
                                <CardFooter>
                                    <Button type="submit" disabled={isGoalsSubmitting || !isGoalsDirty}>
                                        {isGoalsSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                        Salvar Metas
                                    </Button>
                                </CardFooter>
                            </form>
                        </Form>
                    </Card>
                );
            case 'sharing':
                return (
                    <Card className="w-full shadow-none border-none">
                        <CardHeader>
                            <CardTitle>Compartilhamento de Dados</CardTitle>
                            <CardDescription>Compartilhe o código abaixo com seu nutricionista para que ele possa acompanhar seu progresso e criar planos alimentares.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="p-4 bg-muted rounded-lg flex items-center justify-between gap-4">
                                <span className="font-mono text-lg font-bold text-primary">{userProfile.dashboardShareCode || 'Gerando...'}</span>
                                <Button variant="outline" size="icon" onClick={handleCopyCode} disabled={isCopied}>
                                    <Copy className={cn("h-4 w-4", isCopied && 'text-green-500')}/>
                                </Button>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <p className='text-xs text-muted-foreground'>Seu nutricionista usará este código para se conectar à sua conta.</p>
                        </CardFooter>
                    </Card>
                );
            case 'subscription':
                return (
                    <Card className="w-full shadow-none border-none">
                        <CardHeader>
                            <CardTitle>Sua Assinatura</CardTitle>
                            <CardDescription>Abaixo estão os detalhes do seu plano atual.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="text-center space-y-4 p-6 border rounded-lg bg-secondary/30">
                                <Badge variant={effectiveSubscriptionStatus !== 'free' ? 'default' : 'secondary'} className='capitalize text-lg py-1 px-4'>
                                    {effectiveSubscriptionStatus}
                                </Badge>
                                {countdown && (
                                    <div className='p-3 rounded-lg bg-primary/10 text-primary text-center max-w-xs mx-auto'>
                                        <p className='font-bold text-sm flex items-center justify-center gap-2'><AlarmClock className='h-4 w-4'/> Assinatura Ativa</p>
                                        <p className='text-xs font-medium'>Expira em: {countdown}</p>
                                    </div>
                                )}
                                <div className="pt-2">
                                    <Button asChild>
                                        <Link href="/pricing">Ver todos os planos</Link>
                                    </Button>
                                </div>
                            </div>

                            {effectiveSubscriptionStatus !== 'free' && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-lg">Gerenciar Assinatura</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm text-muted-foreground">
                                            Ao cancelar, seu plano permanecerá ativo até a data de expiração, mas não será renovado. Você pode assinar novamente a qualquer momento.
                                        </p>
                                    </CardContent>
                                    <CardFooter>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="destructive" disabled={isCancelling}>
                                                    {isCancelling ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <XCircle className="mr-2 h-4 w-4"/>}
                                                    Cancelar Assinatura
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Confirmar Cancelamento</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                    Tem certeza que deseja cancelar sua assinatura {effectiveSubscriptionStatus}? Você perderá o acesso aos recursos premium ao final do seu ciclo de faturamento.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Voltar</AlertDialogCancel>
                                                    <AlertDialogAction onClick={handleCancelSubscription} className="bg-destructive hover:bg-destructive/90">Confirmar</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </CardFooter>
                                </Card>
                            )}
                        </CardContent>
                    </Card>
                );
            case 'install':
                return (
                    <Card className="w-full shadow-none border-none">
                        <CardHeader>
                            <CardTitle>Instalar Aplicativo</CardTitle>
                            <CardDescription>Instale o Nutrinea no seu dispositivo para uma experiência mais rápida e integrada, como um aplicativo nativo.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex items-center justify-center text-center py-10">
                            <Button size="lg" onClick={triggerInstall}>
                                <Download className="mr-2 h-5 w-5" /> Instalar no seu Dispositivo
                            </Button>
                        </CardContent>
                    </Card>
                );
            default: return null;
        }
    }


    return (
        <AppLayout user={user} userProfile={userProfile} onProfileUpdate={onProfileUpdate}>
            <div className="p-4 sm:p-6 lg:p-8">
                <PageHeader 
                    icon={UserIcon}
                    title="Configurações do Perfil"
                    description="Gerencie suas informações pessoais, assinatura e preferências."
                />

                <div className="mt-8 flex flex-col md:flex-row gap-8 pb-16 sm:pb-8">
                    <nav className="flex flex-row md:flex-col gap-1 w-full md:w-1/4 lg:w-1/5 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0">
                        {navItems.map(item => (
                            <NavButton 
                                key={item.id}
                                active={activeTab === item.id}
                                onClick={() => setActiveTab(item.id as NavItem)}
                                icon={item.icon}
                                label={item.label}
                            />
                        ))}
                    </nav>
                    <main className="flex-1">
                        {renderContent()}
                    </main>
                </div>
            </div>
        </AppLayout>
    );
}
