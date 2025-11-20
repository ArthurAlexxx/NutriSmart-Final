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
import { cancelSubscriptionAction } from '@/app/actions/billing-actions';
import { pauseAccountAction, deleteAccountAction } from '@/app/actions/user-actions';

const formSchema = z.object({
  fullName: z.string().min(3, 'O nome deve ter pelo menos 3 caracteres.'),
  phone: z.string().min(10, 'O celular é obrigatório.').optional(),
  taxId: z.string().min(11, 'O CPF/CNPJ é obrigatório.').optional(),
});

type ProfileFormValues = z.infer<typeof formSchema>;

interface ProfileSettingsModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  userProfile: UserProfile;
  userId: string;
}

export default function ProfileSettingsModal({ isOpen, onOpenChange, userProfile, userId }: ProfileSettingsModalProps) {
  const { toast } = useToast();
  const { onProfileUpdate, effectiveSubscriptionStatus } = useUser();
  const auth = useAuth();
  const router = useRouter();

  const [isCopied, setIsCopied] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(formSchema),
  });
  
  const { isSubmitting, isDirty } = form.formState;

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
  
  const handleCancelSubscription = async () => {
    setIsCancelling(true);
    try {
        const result = await cancelSubscriptionAction(userId);
        if (result.success) {
            toast({ title: "Assinatura Cancelada", description: "Seu plano foi revertido para gratuito." });
            onOpenChange(false);
        } else {
            throw new Error(result.message);
        }
    } catch(error: any) {
         toast({ title: "Erro ao Cancelar", description: error.message || "Não foi possível cancelar a assinatura.", variant: 'destructive' });
    } finally {
        setIsCancelling(false);
    }
  }

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
        // Client-side logout is implicitly handled as the session becomes invalid
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

  const tabsToShow = effectiveSubscriptionStatus !== 'professional' ? ['personal-data', 'sharing', 'subscription', 'advanced'] : ['personal-data', 'subscription', 'advanced'];

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl shadow-2xl p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-2xl font-bold">Configurações</DialogTitle>
          <DialogDescription>
            Gerencie seus dados e sua assinatura.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="personal-data" className="w-full pt-4">
            <div className='px-6'>
                <TabsList className={cn("grid w-full", `grid-cols-${tabsToShow.length}`)}>
                    <TabsTrigger value="personal-data"><UserIcon className="h-5 w-5"/></TabsTrigger>
                    {effectiveSubscriptionStatus !== 'professional' && <TabsTrigger value="sharing"><Share2 className="h-5 w-5"/></TabsTrigger>}
                    <TabsTrigger value="subscription"><CreditCard className="h-5 w-5"/></TabsTrigger>
                    <TabsTrigger value="advanced"><ShieldAlert className="h-5 w-5"/></TabsTrigger>
                </TabsList>
            </div>
            <div className="p-6">
                <TabsContent value="personal-data">
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                           <h3 className="font-semibold text-foreground">Seus Dados</h3>
                          <FormField control={form.control} name="fullName" render={({ field }) => (
                              <FormItem><FormLabel>Nome Completo *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                          )}/>
                           <FormField control={form.control} name="phone" render={({ field }) => (
                              <FormItem><FormLabel>Celular</FormLabel><FormControl><Input placeholder="(XX) XXXXX-XXXX" {...field} /></FormControl><FormMessage /></FormItem>
                          )}/>
                           <FormField control={form.control} name="taxId" render={({ field }) => (
                              <FormItem><FormLabel>CPF/CNPJ</FormLabel><FormControl><Input placeholder="Seu CPF ou CNPJ" {...field} /></FormControl><FormMessage /></FormItem>
                          )}/>
                        <div className="flex justify-end pt-2">
                            <Button type="submit" disabled={isSubmitting || !isDirty}>
                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                Salvar Dados
                            </Button>
                        </div>
                      </form>
                    </Form>
                </TabsContent>
                <TabsContent value="sharing">
                     <div className="space-y-4 text-center">
                         <h3 className="font-semibold text-foreground">Compartilhamento de Dados</h3>
                        <p className="text-sm text-muted-foreground">
                            Compartilhe o código abaixo com seu nutricionista para que ele possa acompanhar seu progresso e criar planos alimentares.
                        </p>
                        <div className="p-4 bg-muted rounded-lg flex items-center justify-between gap-4">
                            <span className="font-mono text-lg font-bold text-primary">{userProfile.dashboardShareCode || 'Gerando...'}</span>
                            <Button variant="outline" size="icon" onClick={handleCopyCode} disabled={isCopied}>
                                <Copy className={cn("h-4 w-4", isCopied && 'text-green-500')}/>
                            </Button>
                        </div>
                    </div>
                </TabsContent>
                <TabsContent value="subscription">
                    <div className="space-y-4 text-center">
                         <h3 className="font-semibold text-foreground">Sua Assinatura</h3>
                        <p className="text-sm">Status da sua assinatura:</p>
                        <Badge variant={effectiveSubscriptionStatus !== 'free' ? 'default' : 'secondary'} className='capitalize text-lg py-1 px-4'>
                            {isTrial ? 'Teste Profissional' : effectiveSubscriptionStatus}
                        </Badge>
                        {countdown && (
                             <div className='p-3 rounded-lg bg-primary/10 text-primary text-center max-w-xs mx-auto'>
                                <p className='font-bold text-sm flex items-center justify-center gap-2'><AlarmClock className='h-4 w-4'/> {isTrial ? 'Período de Teste' : 'Assinatura Ativa'}</p>
                                <p className='text-xs font-medium'>Expira em: {countdown}</p>
                            </div>
                        )}
                        <div className="pt-4">
                            <Button asChild>
                                <Link href="/pricing">Gerenciar Assinatura</Link>
                            </Button>
                        </div>
                         {effectiveSubscriptionStatus !== 'free' && (
                             <div className='pt-6 border-t mt-6'>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" className="text-destructive hover:text-destructive">
                                            <XCircle className="mr-2 h-4 w-4" />
                                            Cancelar Assinatura
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Ao cancelar, você perderá o acesso aos recursos premium no final do ciclo de cobrança atual. Esta ação não pode ser desfeita.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Voltar</AlertDialogCancel>
                                            <AlertDialogAction
                                                onClick={handleCancelSubscription}
                                                disabled={isCancelling}
                                                className='bg-destructive hover:bg-destructive/90'
                                            >
                                                {isCancelling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Confirmar Cancelamento'}
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        )}
                    </div>
                </TabsContent>
                <TabsContent value="advanced">
                    <div className="space-y-6">
                        <h3 className="font-semibold text-foreground">Zona de Perigo</h3>
                        
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
                    </div>
                </TabsContent>
            </div>
        </Tabs>
        <DialogFooter className="border-t p-4 flex-col sm:flex-row gap-2 sm:gap-0">
             <Button variant="ghost" className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 sm:hidden" onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Sair da Conta
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
