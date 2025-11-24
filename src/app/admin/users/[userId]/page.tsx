// src/app/admin/users/[userId]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import AppLayout from '@/components/app-layout';
import { Loader2, ArrowLeft, Save, User as UserIcon, Shield, CreditCard, Calendar as CalendarIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { updateUserAsAdmin } from '@/app/actions/user-actions';
import type { UserProfile } from '@/types/user';

const formSchema = z.object({
    fullName: z.string().min(3, "Nome deve ter pelo menos 3 caracteres."),
    role: z.enum(['patient', 'professional']),
    subscriptionStatus: z.enum(['free', 'premium', 'professional']),
    subscriptionExpiresAt: z.date().optional(),
});

type EditUserFormValues = z.infer<typeof formSchema>;

export default function EditUserPage() {
    const { user, userProfile, isAdmin, isUserLoading, onProfileUpdate } = useUser();
    const router = useRouter();
    const params = useParams();
    const firestore = useFirestore();
    const { toast } = useToast();

    const userId = params.userId as string;

    const userToEditRef = useMemoFirebase(() => {
        if (!isAdmin || !firestore || !userId) return null;
        return doc(firestore, 'users', userId);
    }, [isAdmin, firestore, userId]);

    const { data: userToEdit, isLoading: isLoadingUserToEdit } = useDoc<UserProfile>(userToEditRef);

    const form = useForm<EditUserFormValues>({
        resolver: zodResolver(formSchema),
    });

    useEffect(() => {
        if (!isUserLoading && !isAdmin) {
            router.push('/dashboard');
        }
    }, [isUserLoading, isAdmin, router]);

    useEffect(() => {
        if (userToEdit) {
            form.reset({
                fullName: userToEdit.fullName,
                role: userToEdit.role === 'admin' ? 'professional' : userToEdit.role, // Can't set admin via form
                subscriptionStatus: userToEdit.subscriptionStatus || 'free',
                subscriptionExpiresAt: userToEdit.subscriptionExpiresAt ? (userToEdit.subscriptionExpiresAt as Timestamp).toDate() : undefined,
            });
        }
    }, [userToEdit, form]);
    
    const onSubmit = async (data: EditUserFormValues) => {
        try {
            const result = await updateUserAsAdmin(userId, data);
            if(result.success) {
                toast({ title: "Sucesso", description: result.message });
                router.push('/admin/users');
            } else {
                throw new Error(result.message);
            }
        } catch(e: any) {
            toast({ title: "Erro ao atualizar", description: e.message, variant: "destructive" });
        }
    }


    if (isUserLoading || isLoadingUserToEdit || !isAdmin) {
        return (
            <AppLayout user={user} userProfile={userProfile} onProfileUpdate={onProfileUpdate}>
                <div className="flex h-full w-full items-center justify-center">
                    <Loader2 className="h-16 w-16 animate-spin text-primary" />
                </div>
            </AppLayout>
        );
    }
    
     if (!userToEdit) {
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
                    <h1 className="text-3xl font-bold font-heading">Gerenciar Usuário</h1>
                    <p className="text-muted-foreground">{userToEdit.email}</p>
                    </div>
                </div>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                         <Card>
                             <CardHeader><CardTitle className="flex items-center gap-2"><UserIcon className="h-5 w-5" /> Dados Pessoais</CardTitle></CardHeader>
                             <CardContent>
                                <FormField control={form.control} name="fullName" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nome Completo</FormLabel>
                                        <FormControl><Input {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                            </CardContent>
                         </Card>
                         
                         <Card>
                             <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" /> Acesso e Assinatura</CardTitle></CardHeader>
                             <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                     <FormField control={form.control} name="role" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Role (Permissão)</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value} disabled={userToEdit.role === 'admin'}>
                                                <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    <SelectItem value="patient">Paciente</SelectItem>
                                                    <SelectItem value="professional">Profissional</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}/>
                                     <FormField control={form.control} name="subscriptionStatus" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Status da Assinatura</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    <SelectItem value="free">Gratuito</SelectItem>
                                                    <SelectItem value="premium">Premium</SelectItem>
                                                    <SelectItem value="professional">Profissional</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}/>
                                </div>
                                <FormField control={form.control} name="subscriptionExpiresAt" render={({ field }) => (
                                    <FormItem className='flex flex-col pt-2'>
                                        <FormLabel>Data de Expiração</FormLabel>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                                        {field.value ? format(field.value, "PPP", { locale: ptBR }) : <span>Definir data</span>}
                                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                    </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                                            </PopoverContent>
                                        </Popover>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                            </CardContent>
                         </Card>

                        <div className="flex justify-end">
                            <Button type="submit" disabled={form.formState.isSubmitting || !form.formState.isDirty}>
                                {form.formState.isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                <Save className="h-4 w-4 mr-2" />
                                Salvar Alterações
                            </Button>
                        </div>

                    </form>
                </Form>
            </div>
        </AppLayout>
    );
}
