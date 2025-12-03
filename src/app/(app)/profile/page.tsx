// src/app/(app)/profile/page.tsx
'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Save, User as UserIcon, Share2, CreditCard, Copy, LogOut, AlarmClock, XCircle, ShieldAlert, PauseCircle, Trash2, Mail, Camera, Download, Target, Weight, CalendarIcon, Flame, Droplet, Rocket, Menu } from 'lucide-react';
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

const profileFormSchema = z.object({
  fullName: z.string().min(3, 'O nome deve ter pelo menos 3 caracteres.'),
  phone: z.string().min(10, 'O celular é obrigatório.').optional().or(z.literal('')),
  taxId: z.string().min(11, 'O CPF/CNPJ é obrigatório.').optional().or(z.literal('')),
});
type ProfileFormValues = z.infer<typeof profileFormSchema>;


type NavItem = 'personal' | 'sharing' | 'subscription' | 'install';


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
    const { user, userProfile, onProfileUpdate, effectiveSubscriptionStatus, isAdmin } = useUser();
    const auth = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();

    const initialTab = searchParams.get('tab') === 'subscription' ? 'subscription' : 'personal';
    const [activeTab, setActiveTab] = useState<NavItem>(initialTab);

    const [isCopied, setIsCopied] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isCancelling, setIsCancelling] = useState(false);
    const { canInstall, isPWA } = usePWA();
    const [isSheetOpen, setSheetOpen] = useState(false);
    

    const profileForm = useForm<ProfileFormValues>({
        resolver: zodResolver(profileFormSchema),
    });
    
    const { isSubmitting: isProfileSubmitting, formState: { isDirty: isProfileDirty } } = profileForm;

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


    useEffect(() => {
        if (userProfile) {
            profileForm.reset({
                fullName: userProfile.fullName || '',
                phone: userProfile.phone || '',
                taxId: userProfile.taxId || '',
            });
        }
    }, [userProfile, profileForm]);


    if (!user || !userProfile) {
        return null;
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
    
    const isProfessionalUser = effectiveSubscriptionStatus === 'professional';

    const navItems = [
        { id: 'personal', label: 'Dados Pessoais', icon: UserIcon, visible: true },
        { id: 'sharing', label: 'Compartilhamento', icon: Share2, visible: !isProfessionalUser && !isAdmin },
        { id: 'subscription', label: 'Assinatura', icon: CreditCard, visible: !isAdmin },
        { id: 'install', label: 'Instalar App', icon: Download, visible: canInstall && !isPWA },
    ].filter(item => item.visible);
    
    const currentAvatarSrc = imagePreview || userProfile?.photoURL || '';

    const handleNavClick = (tab: NavItem) => {
        setActiveTab(tab);
        setSheetOpen(false); // Fecha o sheet ao selecionar um item
    }

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
                                        <CardDescription>
                                            Ao cancelar, seu plano permanecerá ativo até a data de expiração, mas não será renovado. Você pode assinar novamente a qualquer momento.
                                        </CardDescription>
                                    </CardHeader>
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
                            <Button size="lg" onClick={() => (window as any).pwaInstallHandler?.prompt()}>
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
                    title="Configurações da Conta"
                    description="Gerencie suas informações pessoais, assinatura e preferências do sistema."
                />

                <div className="mt-8 flex flex-col md:flex-row gap-8 pb-16 sm:pb-8">
                     <div className="md:hidden">
                        <Sheet open={isSheetOpen} onOpenChange={setSheetOpen}>
                            <SheetTrigger asChild>
                                <Button variant="outline" className='w-full justify-between'>
                                    <span>{navItems.find(item => item.id === activeTab)?.label}</span>
                                    <Menu className="h-4 w-4" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="bottom" className="rounded-t-2xl" onOpenAutoFocus={(e) => e.preventDefault()}>
                                <SheetHeader className="text-left">
                                    <SheetTitle>Navegação</SheetTitle>
                                </SheetHeader>
                                <div className="grid gap-2 py-4">
                                     {navItems.map(item => (
                                        <NavButton 
                                            key={item.id}
                                            active={activeTab === item.id}
                                            onClick={() => handleNavClick(item.id as NavItem)}
                                            icon={item.icon}
                                            label={item.label}
                                        />
                                    ))}
                                </div>
                            </SheetContent>
                        </Sheet>
                    </div>
                    <nav className="hidden md:flex md:flex-col gap-1 w-full md:w-1/4 lg:w-1/5">
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
