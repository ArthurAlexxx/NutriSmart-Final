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
import { Loader2, Send, QrCode, Copy } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { createAsaasCustomerAction, createAsaasPaymentAction } from './actions';
import { useToast } from '@/hooks/use-toast';

const customerFormSchema = z.object({
  name: z.string().min(3, 'O nome é obrigatório.'),
  cpfCnpj: z.string().min(11, 'O CPF/CNPJ é obrigatório.'),
  email: z.string().email('O e-mail é obrigatório e deve ser válido.'),
  phone: z.string().optional(),
});

type CustomerFormValues = z.infer<typeof customerFormSchema>;

const paymentFormSchema = z.object({
  customerId: z.string().min(1, "O ID do Cliente é obrigatório."),
  value: z.coerce.number().positive("O valor deve ser maior que zero."),
  description: z.string().min(3, "A descrição é obrigatória."),
});

type PaymentFormValues = z.infer<typeof paymentFormSchema>;

export default function AsaasTestPage() {
    const { user, userProfile, isAdmin, isUserLoading, onProfileUpdate } = useUser();
    const { toast } = useToast();
    const [isLoadingCustomer, setIsLoadingCustomer] = useState(false);
    const [isLoadingPayment, setIsLoadingPayment] = useState(false);
    const [customerApiResponse, setCustomerApiResponse] = useState<any>(null);
    const [paymentApiResponse, setPaymentApiResponse] = useState<any>(null);

    const customerForm = useForm<CustomerFormValues>({
        resolver: zodResolver(customerFormSchema),
        defaultValues: { name: '', cpfCnpj: '', email: '', phone: '' },
    });

    const paymentForm = useForm<PaymentFormValues>({
        resolver: zodResolver(paymentFormSchema),
        defaultValues: { customerId: '', value: 1.00, description: 'Pagamento de Teste' },
    });

    const onCustomerSubmit = async (data: CustomerFormValues) => {
        setIsLoadingCustomer(true);
        setCustomerApiResponse(null);
        try {
            const result = await createAsaasCustomerAction(data);
            setCustomerApiResponse({ status: 'success', data: result });
            paymentForm.setValue('customerId', result.id);
        } catch (error: any) {
            setCustomerApiResponse({ status: 'error', data: { message: error.message } });
        } finally {
            setIsLoadingCustomer(false);
        }
    };
    
    const onPaymentSubmit = async (data: PaymentFormValues) => {
        setIsLoadingPayment(true);
        setPaymentApiResponse(null);
        try {
            const result = await createAsaasPaymentAction(data);
            setPaymentApiResponse({ status: 'success', data: result });
        } catch (error: any) {
            setPaymentApiResponse({ status: 'error', data: { message: error.message } });
        } finally {
            setIsLoadingPayment(false);
        }
    };
    
    const handleCopyCode = (code: string) => {
        navigator.clipboard.writeText(code);
        toast({ title: 'Código Copiado!', description: 'Você pode usar o PIX Copia e Cola no seu banco.' });
    };

    if (isUserLoading) {
        return <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>
    }
    
    return (
        <AppLayout user={user} userProfile={userProfile} onProfileUpdate={onProfileUpdate}>
            <div className="p-4 sm:p-6 lg:p-8 space-y-8">
                <PageHeader
                    icon={Send}
                    title="Teste de API - Asaas"
                    description="Página para testes manuais de integração com a API do Asaas."
                />

                <div className='grid grid-cols-1 lg:grid-cols-2 gap-8 items-start'>
                    <div className='space-y-8'>
                        <Card>
                            <CardHeader><CardTitle>Passo 1: Criar Cliente</CardTitle><CardDescription>Envie uma requisição para criar um novo cliente na plataforma Asaas.</CardDescription></CardHeader>
                            <CardContent>
                                <Form {...customerForm}>
                                    <form onSubmit={customerForm.handleSubmit(onCustomerSubmit)} className="space-y-4">
                                        <FormField control={customerForm.control} name="name" render={({ field }) => (<FormItem><FormLabel>Nome</FormLabel><FormControl><Input {...field} placeholder="Nome do Cliente" /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField control={customerForm.control} name="cpfCnpj" render={({ field }) => (<FormItem><FormLabel>CPF/CNPJ</FormLabel><FormControl><Input {...field} placeholder="000.000.000-00" /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField control={customerForm.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email</FormLabel><FormControl><Input {...field} type="email" placeholder="cliente@email.com" /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField control={customerForm.control} name="phone" render={({ field }) => (<FormItem><FormLabel>Celular (Opcional)</FormLabel><FormControl><Input {...field} placeholder="(XX) XXXXX-XXXX" /></FormControl><FormMessage /></FormItem>)} />
                                        <Button type="submit" disabled={isLoadingCustomer}>
                                            {isLoadingCustomer && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            Criar Cliente
                                        </Button>
                                    </form>
                                </Form>
                            </CardContent>
                        </Card>
                        
                         <Card>
                            <CardHeader><CardTitle>Passo 2: Criar Cobrança PIX</CardTitle><CardDescription>Use o ID do cliente criado para gerar uma cobrança PIX.</CardDescription></CardHeader>
                            <CardContent>
                                <Form {...paymentForm}>
                                    <form onSubmit={paymentForm.handleSubmit(onPaymentSubmit)} className="space-y-4">
                                        <FormField control={paymentForm.control} name="customerId" render={({ field }) => (<FormItem><FormLabel>ID do Cliente</FormLabel><FormControl><Input {...field} placeholder="cus_..." /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField control={paymentForm.control} name="value" render={({ field }) => (<FormItem><FormLabel>Valor (R$)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField control={paymentForm.control} name="description" render={({ field }) => (<FormItem><FormLabel>Descrição</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <Button type="submit" disabled={isLoadingPayment}>
                                            {isLoadingPayment && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            <QrCode className="mr-2 h-4 w-4"/> Gerar PIX
                                        </Button>
                                    </form>
                                </Form>
                            </CardContent>
                        </Card>
                    </div>

                    <div className='space-y-8'>
                        {customerApiResponse && (
                            <Card>
                                <CardHeader><CardTitle>Resposta - Cliente</CardTitle></CardHeader>
                                <CardContent>
                                    <ScrollArea className="h-48 w-full rounded-md border bg-secondary/30 p-4">
                                        <pre className="text-sm">{JSON.stringify(customerApiResponse.data, null, 2)}</pre>
                                    </ScrollArea>
                                </CardContent>
                            </Card>
                        )}
                        {paymentApiResponse && (
                             <Card>
                                <CardHeader><CardTitle>Resposta - Cobrança PIX</CardTitle></CardHeader>
                                <CardContent className='space-y-4'>
                                    {paymentApiResponse.status === 'success' ? (
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="p-4 bg-white rounded-lg border">
                                                <img src={`data:image/png;base64,${paymentApiResponse.data.encodedImage}`} alt="PIX QR Code" width={150} height={150} />
                                            </div>
                                            <Button onClick={() => handleCopyCode(paymentApiResponse.data.payload)} variant="outline" className='w-full'>
                                                <Copy className="mr-2 h-4 w-4" /> Copiar Código PIX
                                            </Button>
                                             <div className='w-full text-left'>
                                                <h4 className='font-semibold'>Webhook de Retorno:</h4>
                                                <p className='text-sm text-muted-foreground'>O pagamento será confirmado automaticamente via webhook. Para testes locais, pague o PIX e verifique os logs no painel do Asaas.</p>
                                             </div>
                                        </div>
                                    ) : (
                                        <ScrollArea className="h-48 w-full rounded-md border bg-secondary/30 p-4">
                                            <pre className="text-sm">{JSON.stringify(paymentApiResponse.data, null, 2)}</pre>
                                        </ScrollArea>
                                    )}
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
