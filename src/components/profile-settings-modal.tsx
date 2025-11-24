// src/components/profile-settings-modal.tsx
'use client';

import { useEffect, useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Save, User as UserIcon, Share2, CreditCard, Copy, LogOut, AlarmClock, XCircle, ShieldAlert, PauseCircle, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { type UserProfile } from '@/types/user';
import { useAuth, useUser } from '@/firebase';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from './ui/badge';
import Link from 'next/link';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { differenceInDays, differenceInHours } from 'date-fns';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { pauseAccountAction, deleteAccountAction } from '@/app/actions/user-actions';
import { Separator } from './ui/separator';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui/card';

const formSchema = z.object({
  fullName: z.string().min(3, 'O nome deve ter pelo menos 3 caracteres.'),
  phone: z.string().min(10, 'O celular é obrigatório.').optional(),
  taxId: z.string().min(11, 'O CPF/CNPJ é obrigatório.').optional(),
});

type ProfileFormValues = z.infer<typeof formSchema>;

type NavItem = 'personal' | 'sharing' | 'subscription' | 'advanced';

interface ProfileSettingsModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  userProfile: UserProfile;
  userId: string;
}

const NavButton = ({ active, onClick, icon: Icon, label }: { active: boolean, onClick: () => void, icon: React.ElementType, label: string }) => (
    <Button
        variant={active ? 'secondary' : 'ghost'}
        onClick={onClick}
        className="w-full justify-start gap-3"
    >
        <Icon className="h-5 w-5" />
        <span className="hidden sm:inline">{label}</span>
    </Button>
);

export default function ProfileSettingsModal({ isOpen, onOpenChange, userProfile, userId }: ProfileSettingsModalProps) {
  const { toast } = useToast();
  const { onProfileUpdate, effectiveSubscriptionStatus } = useUser();
  const auth = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<NavItem>('personal');
  const [isCopied, setIsCopied] = useState(false);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(formSchema),
  });
  
  const { isSubmitting, isDirty } = form.formState;
  
   useEffect(() => {
    if (isOpen) {
      setActiveTab('personal'); // Reset to the first tab when opening
    }
  }, [isOpen]);

  useEffect(() => {
    if (userProfile) {
      form.reset({
        fullName: userProfile.fullName || '',
        phone: userProfile.phone || '',
        taxId: userProfile.taxId || '',
      });
    }
  }, [userProfile, form]);

  const handleSignOut = async () => {
    if (!auth) return;
    try {
        await signOut(auth);
        onOpenChange(false);
        router.push('/');
    } catch (error) {
      console.error("Error signing out: ", error);
      toast({ title: 'Erro ao Sair', description: 'Não foi possível encerrar a sessão. Tente novamente.', variant: 'destructive' });
    }
  };

  const onSubmit = async (data: ProfileFormValues) => {
    if (!isDirty) {
      onOpenChange(false);
      return;
    }
    try {
        const updatedProfile: Partial<UserProfile> = {};
        if (form.formState.dirtyFields.fullName) updatedProfile.fullName = data.fullName;
        if (form.formState.dirtyFields.phone) updatedProfile.phone = data.phone;
        if (form.formState.dirtyFields.taxId) updatedProfile.taxId = data.taxId;
        
        await onProfileUpdate(updatedProfile);
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
        onOpenChange(false);
    }
  };
  
  const handleCopyCode = () => {
    if (!userProfile.dashboardShareCode) return;
    navigator.clipboard.writeText(userProfile.dashboardShareCode);
    setIsCopied(true);
    toast({ title: 'Código Copiado!', description: 'Você pode enviar este código para seu nutricionista.'});
    setTimeout(() => setIsCopied(false), 3000);
  };

  const handlePauseAccount = async () => {
    setIsProcessingAction(true);
    const result = await pauseAccountAction(userId);
    if (result.success) {
        toast({ title: 'Conta Pausada', description: 'Sua conta foi pausada e você será desconectado.'});
        await handleSignOut();
    } else {
        toast({ title: 'Erro', description: result.message, variant: 'destructive' });
    }
    setIsProcessingAction(false);
  }

  const handleDeleteAccount = async () => {
    setIsProcessingAction(true);
    const result = await deleteAccountAction(userId);
     if (result.success) {
        toast({ title: 'Conta Excluída', description: 'Sua conta foi permanentemente removida.', duration: 5000 });
        onOpenChange(false);
        router.push('/');
    } else {
        toast({ title: 'Erro Crítico', description: result.message, variant: 'destructive' });
    }
    setIsProcessingAction(false);
  }

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
  
  const isTrial = effectiveSubscriptionStatus === 'professional' && userProfile.subscriptionStatus === 'free' && countdown;
  const isProfessionalUser = effectiveSubscriptionStatus === 'professional';

  const navItems = [
    { id: 'personal', label: 'Dados Pessoais', icon: UserIcon, visible: true },
    { id: 'sharing', label: 'Compartilhamento', icon: Share2, visible: !isProfessionalUser },
    { id: 'subscription', label: 'Assinatura', icon: CreditCard, visible: true },
    { id: 'advanced', label: 'Avançado', icon: ShieldAlert, visible: true },
  ].filter(item => item.visible);

  const renderContent = () => {
    switch(activeTab) {
        case 'personal':
            return (
                <Card className="w-full shadow-none border-none">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)}>
                            <CardHeader>
                                <CardTitle>Dados Pessoais</CardTitle>
                                <CardDescription>Mantenha seus dados de contato e identificação atualizados.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <FormField control={form.control} name="fullName" render={({ field }) => (
                                    <FormItem><FormLabel>Nome Completo *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name="phone" render={({ field }) => (
                                    <FormItem><FormLabel>Celular</FormLabel><FormControl><Input placeholder="(XX) XXXXX-XXXX" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name="taxId" render={({ field }) => (
                                    <FormItem><FormLabel>CPF/CNPJ</FormLabel><FormControl><Input placeholder="Seu CPF ou CNPJ" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                            </CardContent>
                            <CardFooter>
                                <Button type="submit" disabled={isSubmitting || !isDirty}>
                                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
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
                                {isTrial ? 'Teste Profissional' : effectiveSubscriptionStatus}
                            </Badge>
                            {countdown && (
                                <div className='p-3 rounded-lg bg-primary/10 text-primary text-center max-w-xs mx-auto'>
                                    <p className='font-bold text-sm flex items-center justify-center gap-2'><AlarmClock className='h-4 w-4'/> {isTrial ? 'Período de Teste' : 'Assinatura Ativa'}</p>
                                    <p className='text-xs font-medium'>Expira em: {countdown}</p>
                                </div>
                            )}
                            <div className="pt-2">
                                <Button asChild>
                                    <Link href="/pricing">Ver todos os planos</Link>
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            );
        case 'advanced':
            return (
                 <Card className="w-full shadow-none border-none">
                    <CardHeader>
                        <CardTitle>Zona de Perigo</CardTitle>
                        <CardDescription>Ações que afetam sua conta de forma permanente.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="border border-yellow-500/50 bg-yellow-500/5 p-4 rounded-lg">
                            <h4 className="font-semibold flex items-center gap-2 text-yellow-600"><PauseCircle className="h-5 w-5"/> Pausar Conta</h4>
                            <p className="text-sm text-muted-foreground mt-1 mb-3">Sua conta ficará inativa e você será desconectado. Seus dados serão mantidos para quando você voltar.</p>
                             <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="outline" className="text-yellow-600 border-yellow-500/50 hover:bg-yellow-500/10 hover:text-yellow-700">Pausar minha conta</Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader><AlertDialogTitle>Pausar sua conta?</AlertDialogTitle><AlertDialogDescription>Você será desconectado e não poderá acessar seus dados até fazer login novamente. Deseja continuar?</AlertDialogDescription></AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction onClick={handlePauseAccount} disabled={isProcessingAction} className='bg-yellow-500 hover:bg-yellow-600'>Confirmar Pausa</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>

                        <div className="border border-destructive/50 bg-destructive/5 p-4 rounded-lg">
                            <h4 className="font-semibold flex items-center gap-2 text-destructive"><Trash2 className="h-5 w-5"/> Excluir Conta</h4>
                            <p className="text-sm text-muted-foreground mt-1 mb-3">Esta ação é irreversível. Todos os seus dados, incluindo histórico, planos e informações de perfil, serão permanentemente apagados.</p>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                     <Button variant="destructive">Excluir permanentemente</Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader><AlertDialogTitle>Você tem ABSOLUTA certeza?</AlertDialogTitle><AlertDialogDescription>Isto irá apagar sua conta e todos os seus dados de forma permanente. Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleDeleteAccount} disabled={isProcessingAction} className='bg-destructive hover:bg-destructive/90'>Eu entendo, excluir tudo</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </CardContent>
                </Card>
            );
        default: return null;
    }
  }


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 sm:p-0 shadow-2xl flex flex-col sm:flex-row gap-0 max-h-[90vh] sm:max-h-[600px]">
        <div className="w-full sm:w-1/4 p-4 border-b sm:border-b-0 sm:border-r">
          <h2 className="text-xl font-bold p-2 hidden sm:block">Configurações</h2>
          <nav className="flex flex-row sm:flex-col gap-1 mt-0 sm:mt-4">
            {navItems.map(item => (
                 <NavButton 
                    key={item.id}
                    active={activeTab === item.id}
                    onClick={() => setActiveTab(item.id as NavItem)}
                    icon={item.icon}
                    label={item.label}
                 />
            ))}
            <div className='flex-1 sm:hidden'></div>
             <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="sm:hidden text-muted-foreground" onSelect={(e) => e.preventDefault()}>
                      <LogOut className="h-5 w-5"/>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Você tem certeza?</AlertDialogTitle><AlertDialogDescription>Isso encerrará sua sessão atual.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleSignOut} className='bg-destructive hover:bg-destructive/90'>Confirmar Saída</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
          </nav>
           <div className="mt-auto pt-4 border-t hidden sm:block">
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="ghost" className="w-full justify-start gap-3" onSelect={(e) => e.preventDefault()}>
                        <LogOut className="h-5 w-5" /> Sair da Conta
                    </Button>
                </AlertDialogTrigger>
                 <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Você tem certeza?</AlertDialogTitle><AlertDialogDescription>Isso encerrará sua sessão atual e você precisará fazer login novamente.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleSignOut} className='bg-destructive hover:bg-destructive/90'>Confirmar Saída</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            </div>
        </div>
        <div className="w-full sm:w-3/4 p-6 overflow-y-auto">
            {renderContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
}
