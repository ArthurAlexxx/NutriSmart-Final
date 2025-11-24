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

export default function ViewUserPage() {
    const { user, userProfile, isAdmin, isUserLoading, onProfileUpdate } = useUser();
    const router = useRouter();
    const params = useParams();
    const firestore = useFirestore();

    const userId = params.userId as string;

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

    const getSubscriptionStatus = (user: UserProfile) => {
        if (user.subscriptionStatus === 'free') return 'Gratuito';
        
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

    return (
        <AppLayout user={user} userProfile={userProfile} onProfileUpdate={onProfileUpdate}>
            <div className="container mx-auto py-8">
                 <div className="flex items-center gap-4 mb-8">
                    <Button asChild variant="outline" size="icon">
                    <Link href="/admin/users"><ArrowLeft className="h-4 w-4" /></Link>
                    </Button>
                    <div>
                    <h1 className="text-3xl font-bold font-heading">Detalhes do Usuário</h1>
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
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div><p className="text-sm text-muted-foreground">Role (Permissão)</p><p className="font-semibold capitalize">{userToView.role}</p></div>
                                <div><p className="text-sm text-muted-foreground">Status da Assinatura</p><p className="font-semibold capitalize">{getSubscriptionStatus(userToView)}</p></div>
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
                        <p className="text-xs text-muted-foreground">Para editar dados do usuário, acesse o Console do Firebase.</p>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
