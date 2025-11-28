// src/app/admin/asaas-test/page.tsx
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import AppLayout from '@/components/app-layout';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, UserPlus, XCircle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { createCustomerAction } from './actions';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/firebase';

const formSchema = z.object({
  name: z.string().min(3, 'O nome é obrigatório.'),
  cpfCnpj: z.string().min(11, 'O CPF/CNPJ é obrigatório.'),
});

type FormValues = z.infer<typeof formSchema>;

export default function AsaasTestPage() {
    const { user, userProfile, onProfileUpdate } = useUser();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [apiResponse, setApiResponse] = useState<any>(null);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
          name: '',
          cpfCnpj: '',
        },
    });

    const onSubmit = async (data: FormValues) => {
        setIsLoading(true);
        setApiResponse(null);

        try {
            const result = await createCustomerAction(data);
            setApiResponse({ status: 'success', data: result });
            toast({ title: "Cliente Criado!", description: `O cliente ${result.name} foi criado com o ID: ${result.id}` });
        } catch (error: any) {
            setApiResponse({ status: 'error', data: { message: error.message } });
            toast({ title: "Erro ao Criar Cliente", description: error.message, variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };
    
    const renderResult = () => {
        if (!apiResponse) return null;

        const cardTitleClass = apiResponse.status === 'success' 
            ? 'text-green-500' 
            : 'text-destructive';
        
        const TitleIcon = apiResponse.status === 'success' ? UserPlus : XCircle;

        return (
            <Card>
                <CardHeader>
                    <CardTitle className={`flex items-center gap-2 ${cardTitleClass}`}>
                        <TitleIcon/> {apiResponse.status === 'success' ? 'Cliente Criado com Sucesso' : 'Erro na Requisição'}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-64 w-full rounded-md border bg-secondary/30 p-4">
                        <pre className="text-sm whitespace-pre-wrap">{JSON.stringify(apiResponse?.data, null, 2)}</pre>
                    </ScrollArea>
                </CardContent>
            </Card>
        );
    };

    return (
        <AppLayout user={user} userProfile={userProfile} onProfileUpdate={onProfileUpdate}>
            <div className="p-4 sm:p-6 lg:p-8 space-y-8">
                <PageHeader
                    icon={UserPlus}
                    title="Teste de Criação de Cliente - Asaas"
                    description="Página para teste isolado de criação de clientes na API do Asaas."
                />

                <div className='grid grid-cols-1 lg:grid-cols-2 gap-8 items-start'>
                    <div className='space-y-8'>
                        <Card>
                            <CardHeader>
                                <CardTitle>Criar Novo Cliente</CardTitle>
                                <CardDescription>Preencha os dados para criar um novo cliente no Asaas.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Form {...form}>
                                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                        <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Nome</FormLabel><FormControl><Input {...field} placeholder="Nome do Cliente" /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField control={form.control} name="cpfCnpj" render={({ field }) => (<FormItem><FormLabel>CPF/CNPJ</FormLabel><FormControl><Input {...field} placeholder="000.000.000-00" /></FormControl><FormMessage /></FormItem>)} />
                                        
                                        <Button type="submit" disabled={isLoading} className="w-full">
                                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4"/>}
                                            Criar Cliente
                                        </Button>
                                    </form>
                                </Form>
                            </CardContent>
                        </Card>
                    </div>

                    <div className='space-y-8 sticky top-24'>
                        {apiResponse && renderResult()}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
