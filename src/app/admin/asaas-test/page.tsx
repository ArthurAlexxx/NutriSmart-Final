// src/app/admin/asaas-test/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import AppLayout from '@/components/app-layout';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Loader2, Send, QrCode, Copy, CreditCard, Barcode, CheckCircle, XCircle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { createAsaasCustomerAction, createAsaasPaymentAction } from './actions';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import type { WebhookLog } from '@/types/webhook';
import { format } from 'date-fns';
import Link from 'next/link';

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
  billingType: z.enum(['PIX', 'BOLETO', 'CREDIT_CARD'], { required_error: 'Selecione um método de pagamento.' }),
});

type PaymentFormValues = z.infer<typeof paymentFormSchema>;

export default function AsaasTestPage() {
    const { user, userProfile, isAdmin, isUserLoading, onProfileUpdate } = useUser();
    const { toast } = useToast();
    const [isLoadingCustomer, setIsLoadingCustomer] = useState(false);
    const [isLoadingPayment, setIsLoadingPayment] = useState(false);
    const [customerApiResponse, setCustomerApiResponse] = useState<any>(null);
    const [paymentApiResponse, setPaymentApiResponse] = useState<any>(null);

    const firestore = useFirestore();
    const webhookLogsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'webhook_logs'), orderBy('createdAt', 'desc'), limit(1));
    }, [firestore]);

    const { data: latestWebhook } = useCollection<WebhookLog>(webhookLogsQuery);
    const lastLog = latestWebhook?.[0];

    const customerForm = useForm<CustomerFormValues>({
        resolver: zodResolver(customerFormSchema),
        defaultValues: { name: '', cpfCnpj: '', email: '', phone: '' },
    });

    const paymentForm = useForm<PaymentFormValues>({
        resolver: zodResolver(paymentFormSchema),
        defaultValues: { customerId: '', value: 1.00, description: 'Pagamento de Teste', billingType: 'PIX' },
    });

    const onCustomerSubmit = async (data: CustomerFormValues) => {
        setIsLoadingCustomer(true);
        setCustomerApiResponse(null);
        try {
            const result = await createAsaasCustomerAction(data);
            setCustomerApiResponse({ status: 'success', data: result });
            paymentForm.setValue('customerId', result.id); // Sincroniza o ID do cliente
            toast({ title: "Cliente Criado!", description: `ID ${result.id} preenchido no Passo 2.` });
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
    
    const renderPaymentResult = () => {
        if (!paymentApiResponse || paymentApiResponse.status !== 'success') {
            return (
                <ScrollArea className="h-48 w-full rounded-md border bg-secondary/30 p-4">
                    <pre className="text-sm">{JSON.stringify(paymentApiResponse?.data, null, 2)}</pre>
                </ScrollArea>
            );
        }

        const { data } = paymentApiResponse;

        switch (data.type) {
            case 'PIX':
                return (
                    <div className="flex flex-col items-center gap-4">
                        <div className="p-4 bg-white rounded-lg border">
                            <img src={`data:image/png;base64,${data.encodedImage}`} alt="PIX QR Code" width={150} height={150} />
                        </div>
                        <Button onClick={() => handleCopyCode(data.payload)} variant="outline" className='w-full'>
                            <Copy className="mr-2 h-4 w-4" /> Copiar Código PIX
                        </Button>
                    </div>
                );
            case 'BOLETO':
                 return (
                    <div className="flex flex-col items-center gap-4 text-left w-full">
                         <div className="p-4 border rounded-lg w-full">
                            <FormLabel>Linha Digitável</FormLabel>
                            <p className="text-sm break-all">{data.identificationField}</p>
                         </div>
                        <Button onClick={() => handleCopyCode(data.identificationField)} variant="outline" className='w-full'>
                            <Copy className="mr-2 h-4 w-4" /> Copiar Linha Digitável
                        </Button>
                        <Button asChild variant="secondary" className="w-full">
                            <a href={data.bankSlipUrl} target="_blank" rel="noopener noreferrer">
                                <Barcode className="mr-2 h-4 w-4" /> Ver Boleto (PDF)
                            </a>
                        </Button>
                    </div>
                 );
            case 'CREDIT_CARD':
                return (
                    <div className="flex flex-col items-center gap-4 text-left w-full">
                        <div className="p-4 border rounded-lg w-full">
                            <FormLabel>Link de Pagamento</FormLabel>
                             <p className="text-sm text-primary break-all">O link foi gerado e pode ser enviado ao cliente.</p>
                         </div>
                        <Button asChild variant="default" className="w-full">
                            <a href={data.transactionReceiptUrl} target="_blank" rel="noopener noreferrer">
                                <CreditCard className="mr-2 h-4 w-4" /> Abrir Link de Pagamento
                            </a>
                        </Button>
                    </div>
                );
            default:
                return <p>Tipo de pagamento desconhecido.</p>;
        }
    };


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
                            <CardHeader><CardTitle>Passo 2: Criar Cobrança</CardTitle><CardDescription>Use o ID do cliente para gerar uma cobrança.</CardDescription></CardHeader>
                            <CardContent>
                                <Form {...paymentForm}>
                                    <form onSubmit={paymentForm.handleSubmit(onPaymentSubmit)} className="space-y-4">
                                        <FormField control={paymentForm.control} name="customerId" render={({ field }) => (<FormItem><FormLabel>ID do Cliente</FormLabel><FormControl><Input {...field} placeholder="Preenchido após o Passo 1" /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField control={paymentForm.control} name="billingType" render={({ field }) => (
                                            <FormItem><FormLabel>Método de Pagamento</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}><FormControl>
                                                <SelectTrigger><SelectValue placeholder="Selecione o método" /></SelectTrigger>
                                            </FormControl><SelectContent>
                                                <SelectItem value="PIX">PIX</SelectItem>
                                                <SelectItem value="BOLETO">Boleto</SelectItem>
                                                <SelectItem value="CREDIT_CARD">Cartão de Crédito (Link)</SelectItem>
                                            </SelectContent></Select><FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField control={paymentForm.control} name="value" render={({ field }) => (<FormItem><FormLabel>Valor (R$)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField control={paymentForm.control} name="description" render={({ field }) => (<FormItem><FormLabel>Descrição</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <Button type="submit" disabled={isLoadingPayment}>
                                            {isLoadingPayment && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            <QrCode className="mr-2 h-4 w-4"/> Gerar Cobrança
                                        </Button>
                                    </form>
                                </Form>
                            </CardContent>
                        </Card>
                    </div>

                    <div className='space-y-8 sticky top-24'>
                        {lastLog && (
                            <Card className="border-green-500 bg-green-500/5">
                                <CardHeader>
                                    <CardTitle className='flex items-center gap-2'>
                                        {lastLog.status === 'SUCCESS' ? <CheckCircle className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-destructive" />}
                                        Último Webhook Recebido
                                    </CardTitle>
                                    <CardDescription>{lastLog.createdAt ? format(lastLog.createdAt.toDate(), "dd/MM/yyyy HH:mm:ss") : 'N/A'}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm font-semibold">{lastLog.details}</p>
                                    <p className="text-xs text-muted-foreground mt-2">Isso confirma que nosso sistema recebeu a notificação do Asaas. Veja a auditoria completa em <Link href="/admin/logs" className='underline'>Logs de Webhooks</Link>.</p>
                                </CardContent>
                            </Card>
                        )}
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
                                <CardHeader><CardTitle>Resposta - Cobrança</CardTitle></CardHeader>
                                <CardContent className='space-y-4'>
                                    {renderPaymentResult()}
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
