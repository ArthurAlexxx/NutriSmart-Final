// src/app/admin/asaas-test/page.tsx
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useUser } from '@/firebase';
import AppLayout from '@/components/app-layout';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Loader2, Send } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

const formSchema = z.object({
  name: z.string().min(3, 'O nome é obrigatório.'),
  cpfCnpj: z.string().min(11, 'O CPF/CNPJ é obrigatório.'),
  email: z.string().email('O e-mail é obrigatório e deve ser válido.'),
  phone: z.string().optional(),
});

type CustomerFormValues = z.infer<typeof formSchema>;

async function createAsaasCustomerAction(data: CustomerFormValues): Promise<any> {
    'use server';

    const asaasApiKey = process.env.ASAAS_API_KEY;
    const isSandbox = asaasApiKey?.includes('sandbox') || asaasApiKey?.includes('hmlg');
    const asaasApiUrl = isSandbox ? 'https://sandbox.asaas.com/api/v3' : 'https://api.asaas.com/v3';

    if (!asaasApiKey) {
        throw new Error('ASAAS_API_KEY não está configurada no servidor.');
    }
    
    try {
        const response = await fetch(`${asaasApiUrl}/customers`, {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'content-type': 'application/json',
                'access_token': asaasApiKey,
            },
            body: JSON.stringify(data),
        });

        const responseData = await response.json();

        if (!response.ok) {
            console.error('Asaas API Error:', responseData);
            const errorMessage = responseData.errors?.[0]?.description || `Falha na requisição: ${response.statusText}`;
            throw new Error(errorMessage);
        }

        return responseData;

    } catch (error: any) {
        console.error('Error creating Asaas customer:', error);
        throw new Error(error.message || 'Erro desconhecido ao criar cliente no Asaas.');
    }
}

export default function AsaasTestPage() {
    const { user, userProfile, isAdmin, isUserLoading, onProfileUpdate } = useUser();
    const [isLoading, setIsLoading] = useState(false);
    const [apiResponse, setApiResponse] = useState<any>(null);

    const form = useForm<CustomerFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: '',
            cpfCnpj: '',
            email: '',
            phone: '',
        },
    });

    const onSubmit = async (data: CustomerFormValues) => {
        setIsLoading(true);
        setApiResponse(null);
        try {
            const result = await createAsaasCustomerAction(data);
            setApiResponse({ status: 'success', data: result });
        } catch (error: any) {
            setApiResponse({ status: 'error', data: { message: error.message } });
        } finally {
            setIsLoading(false);
        }
    };

    if (isUserLoading) {
        return (
          <AppLayout user={user} userProfile={userProfile} onProfileUpdate={onProfileUpdate}>
            <div className="flex h-full w-full items-center justify-center">
              <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
          </AppLayout>
        );
    }
    
    return (
        <AppLayout user={user} userProfile={userProfile} onProfileUpdate={onProfileUpdate}>
            <div className="p-4 sm:p-6 lg:p-8 space-y-8">
                <PageHeader
                    icon={Send}
                    title="Teste de API - Asaas"
                    description="Página para testes manuais de integração com a API do Asaas."
                />

                <Card>
                    <CardHeader>
                        <CardTitle>Passo 1: Criar Cliente</CardTitle>
                        <CardDescription>
                            Use o formulário abaixo para enviar uma requisição de criação de cliente para a API do Asaas.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Nome</FormLabel><FormControl><Input {...field} placeholder="Nome do Cliente" /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={form.control} name="cpfCnpj" render={({ field }) => (<FormItem><FormLabel>CPF/CNPJ</FormLabel><FormControl><Input {...field} placeholder="000.000.000-00" /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email</FormLabel><FormControl><Input {...field} type="email" placeholder="cliente@email.com" /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={form.control} name="phone" render={({ field }) => (<FormItem><FormLabel>Celular (Opcional)</FormLabel><FormControl><Input {...field} placeholder="(XX) XXXXX-XXXX" /></FormControl><FormMessage /></FormItem>)} />
                                </div>
                                <Button type="submit" disabled={isLoading}>
                                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Enviar Requisição
                                </Button>
                            </form>
                        </Form>
                    </CardContent>
                </Card>

                {apiResponse && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Resposta da API</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-64 w-full rounded-md border bg-secondary/30 p-4">
                                <pre className="text-sm">{JSON.stringify(apiResponse.data, null, 2)}</pre>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                )}
            </div>
        </AppLayout>
    );
}
