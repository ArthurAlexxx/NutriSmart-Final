// src/app/admin/users/[userId]/page.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import AppLayout from '@/components/app-layout';
import { Loader2, ArrowLeft, User as UserIcon, Shield, CreditCard, CalendarIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import type { UserProfile } from '@/types/user';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { updateUserSubscriptionStatusAction } from '@/app/actions/user-actions';

export default function ViewUserPage() {
    const { user, userProfile, isAdmin, isUserLoading, onProfileUpdate } = useUser();
    const router = useRouter();
    const params = useParams();
    const firestore = useFirestore();
    const { toast } = useToast();

    const userId = params.userId as string;
    const [isUpdating, setIsUpdating] = useState(false);

    const userToViewRef = useMemoFirebase(() => {
        if (!isAdmin || !firestore || !userId) return null;
        return doc(firestore, 'users', userId);
    }, [isAdmin, firestore, userId]);

    const { data: userToView, isLoading: isLoadingUserToView } = useDoc<UserProfile>(userToViewRef);

    useEffect(() => {
        if (!isUserLoading && !isAdmin) {
            router.push('/dashboard');
        }
    }, [isUserLoading, isAdmin, router]);

    const handleSubscriptionChange = async (newStatus: 'free' | 'premium' | 'professional') => {
        if (!user || !userToView || newStatus === userToView.subscriptionStatus) return;

        setIsUpdating(true);
        try {
            const idToken = await user.getIdToken();
            
            const result = await updateUserSubscriptionStatusAction(userToView.id, newStatus);

            if (!result.success) {
                throw new Error(result.message || 'Falha ao atualizar a assinatura.');
            }

            toast({ title: "Sucesso!", description: result.message });
        } catch (error: any) {
            console.error("Error updating subscription:", error);
            toast({
                title: "Erro ao atualizar assinatura",
                description: error.message,
                variant: 'destructive',
            });
        } finally {
            setIsUpdating(false);
        }
    };


    const getSubscriptionStatus = (user: UserProfile) => {
        if (user.subscriptionStatus === 'free' || !user.subscriptionStatus) return 'Gratuito';
        
        const expiresAt = user.subscriptionExpiresAt ? (user.subscriptionExpiresAt as Timestamp).toDate() : null;
        if (expiresAt && expiresAt < new Date()) {
            return `Expirado (${user.subscriptionStatus})`;
        }
        
        return user.subscriptionStatus;
    };
    
    if (isUserLoading || isLoadingUserToView || !isAdmin) {
        return (
            <AppLayout user={user} userProfile={userProfile} onProfileUpdate={onProfileUpdate}>
                <div className="flex h-full w-full items-center justify-center">
                    <Loader2 className="h-16 w-16 animate-spin text-primary" />
                </div>
            </AppLayout>
        );
    }
    
     if (!userToView) {
        return (
            <AppLayout user={user} userProfile={userProfile} onProfileUpdate={onProfileUpdate}>
                <div className="text-center">Usuário não encontrado.</div>
            </AppLayout>
        );
    }
    
    const isCurrentUserAdmin = user?.uid === userToView.id;


    return (
        <AppLayout user={user} userProfile={userProfile} onProfileUpdate={onProfileUpdate}>
            <div className="p-4 sm:p-6 lg:p-8 pb-16 sm:pb-8">
                 <div className="flex items-center gap-4 mb-8">
                    <Button asChild variant="outline" size="icon">
                    <Link href="/admin/users"><ArrowLeft className="h-4 w-4" /></Link>
                    </Button>
                    <div>
                    <h1 className="text-3xl font-bold font-heading flex items-center gap-3">
                        <UserIcon className="h-8 w-8 text-primary" />
                        Detalhes do Usuário
                    </h1>
                    <p className="text-muted-foreground">{userToView.email}</p>
                    </div>
                </div>

                <div className="space-y-8">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><UserIcon className="h-5 w-5" /> Dados Pessoais</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div><p className="text-sm text-muted-foreground">Nome Completo</p><p className="font-semibold">{userToView.fullName}</p></div>
                                <div><p className="text-sm text-muted-foreground">E-mail</p><p className="font-semibold">{userToView.email}</p></div>
                                <div><p className="text-sm text-muted-foreground">Telefone</p><p className="font-semibold">{userToView.phone || 'N/A'}</p></div>
                                <div><p className="text-sm text-muted-foreground">CPF/CNPJ</p><p className="font-semibold">{userToView.taxId || 'N/A'}</p></div>
                            </div>
                        </CardContent>
                    </Card>
                    
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" /> Acesso e Assinatura</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                                <div><p className="text-sm text-muted-foreground">Role</p><p className="font-semibold capitalize">{userToView.role}</p></div>
                                <div>
                                    <p className="text-sm text-muted-foreground mb-2">Plano de Assinatura</p>
                                    <div className='flex items-center gap-2'>
                                        <Select
                                            value={userToView.subscriptionStatus || 'free'}
                                            onValueChange={(value) => handleSubscriptionChange(value as 'free' | 'premium' | 'professional')}
                                            disabled={isUpdating || isCurrentUserAdmin}
                                        >
                                            <SelectTrigger className="w-[180px]">
                                                <SelectValue placeholder="Selecionar plano" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="free">Gratuito</SelectItem>
                                                <SelectItem value="premium">Premium</SelectItem>
                                                <SelectItem value="professional">Profissional</SelectItem>
                                            </SelectContent>
                                        </Select>
                                         {isUpdating && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
                                    </div>
                                    {isCurrentUserAdmin && <p className="text-xs text-muted-foreground mt-2">Admins não podem alterar o próprio plano.</p>}
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Data de Expiração</p>
                                    <p className="font-semibold">
                                        {userToView.subscriptionExpiresAt ? format((userToView.subscriptionExpiresAt as Timestamp).toDate(), "PPP", { locale: ptBR }) : 'N/A'}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex justify-end">
                        <p className="text-xs text-muted-foreground">Para editar outros dados, acesse o Console do Firebase.</p>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
