// src/app/admin/asaas-test/page.tsx
'use client';

import { useState } from 'react';
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
import { createCustomerAndPaymentAction } from './actions';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import type { WebhookLog } from '@/types/webhook';
import { format } from 'date-fns';
import Link from 'next/link';

const formSchema = z.object({
  name: z.string().min(3, 'O nome é obrigatório.'),
  cpfCnpj: z.string().min(11, 'O CPF/CNPJ é obrigatório.'),
  email: z.string().email('O e-mail é obrigatório e deve ser válido.'),
  phone: z.string().optional(),
  billingType: z.enum(['PIX', 'BOLETO', 'CREDIT_CARD'], { required_error: 'Selecione um método de pagamento.' }),
  value: z.coerce.number().min(5, "O valor mínimo para cobranças é R$ 5,00."),
  description: z.string().min(3, "A descrição é obrigatória."),
});

type FormValues = z.infer<typeof formSchema>;

export default function AsaasTestPage() {
    const { user, userProfile, isAdmin, isUserLoading, onProfileUpdate } = useUser();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [paymentApiResponse, setPaymentApiResponse] = useState<any>(null);

    const firestore = useFirestore();
    const webhookLogsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'webhook_logs'), orderBy('createdAt', 'desc'), limit(1));
    }, [firestore]);

    const { data: latestWebhook } = useCollection<WebhookLog>(webhookLogsQuery);
    const lastLog = latestWebhook?.[0];

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
          name: '',
          cpfCnpj: '',
          email: '',
          phone: '',
          billingType: 'PIX',
          value: 5.00,
          description: 'Pagamento de Teste',
        },
    });

    const onSubmit = async (data: FormValues) => {
        setIsLoading(true);
        setPaymentApiResponse(null);

        try {
            const result = await createCustomerAndPaymentAction(data);
            setPaymentApiResponse({ status: 'success', data: result });
            toast({ title: "Cobrança Gerada!", description: `Cobrança via ${data.billingType} foi criada com sucesso.` });
        } catch (error: any) {
            setPaymentApiResponse({ status: 'error', data: { message: error.message } });
            toast({ title: "Erro ao Gerar Cobrança", description: error.message, variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleCopyCode = (code: string) => {
        navigator.clipboard.writeText(code);
        toast({ title: 'Código Copiado!', description: 'Você pode usar o código no seu banco.' });
    };

    if (isUserLoading) {
        return <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>
    }
    
    const renderPaymentResult = () => {
        if (!paymentApiResponse) return null;

        if (paymentApiResponse.status !== 'success') {
            return (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-destructive flex items-center gap-2"><XCircle/> Erro na Requisição</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-48 w-full rounded-md border bg-secondary/30 p-4">
                            <pre className="text-sm whitespace-pre-wrap">{JSON.stringify(paymentApiResponse?.data, null, 2)}</pre>
                        </ScrollArea>
                    </CardContent>
                </Card>
            );
        }

        const { data } = paymentApiResponse;

        switch (data.type) {
            case 'PIX':
                return (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><QrCode/> Resultado PIX</CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col items-center gap-4">
                            <div className="p-4 bg-white rounded-lg border">
                                <img src={`data:image/png;base64,${data.encodedImage}`} alt="PIX QR Code" width={150} height={150} />
                            </div>
                            <Button onClick={() => handleCopyCode(data.payload)} variant="outline" className='w-full'>
                                <Copy className="mr-2 h-4 w-4" /> Copiar Código PIX
                            </Button>
                        </CardContent>
                    </Card>
                );
            case 'BOLETO':
                 return (
                    <Card>
                        <CardHeader>
                             <CardTitle className="flex items-center gap-2"><Barcode/> Resultado Boleto</CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col items-center gap-4 text-left w-full">
                            <div className="p-4 border rounded-lg w-full bg-secondary/30">
                                <p className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 mb-2">Linha Digitável</p>
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
                        </CardContent>
                    </Card>
                 );
            case 'CREDIT_CARD':
                return (
                     <Card>
                        <CardHeader>
                             <CardTitle className="flex items-center gap-2"><CreditCard/> Resultado Cartão de Crédito</CardTitle>
                        </CardHeader>
                        <CardContent className="text-center">
                            <p className="text-muted-foreground">O link de pagamento foi gerado. Em um fluxo real, o usuário seria redirecionado.</p>
                            <Button asChild variant="default" className="w-full mt-4">
                                <a href={data.invoiceUrl} target="_blank" rel="noopener noreferrer">
                                    <CreditCard className="mr-2 h-4 w-4" /> Ver Fatura
                                </a>
                            </Button>
                        </CardContent>
                    </Card>
                );
            default:
                return (
                     <Card>
                        <CardHeader>
                             <CardTitle>Resultado Desconhecido</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-48 w-full rounded-md border bg-secondary/30 p-4">
                                <pre className="text-sm">{JSON.stringify(paymentApiResponse?.data, null, 2)}</pre>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                );
        }
    };

    return (
        <AppLayout user={user} userProfile={userProfile} onProfileUpdate={onProfileUpdate}>
            <div className="p-4 sm:p-6 lg:p-8 space-y-8">
                <PageHeader
                    icon={Send}
                    title="Teste de API - Asaas"
                    description="Página para testes manuais de ponta a ponta com a API do Asaas."
                />

                <div className='grid grid-cols-1 lg:grid-cols-2 gap-8 items-start'>
                    <div className='space-y-8'>
                        <Card>
                            <CardHeader><CardTitle>Gerar Cliente e Cobrança</CardTitle><CardDescription>Preencha os dados para criar um cliente (ou usar um existente) e gerar uma cobrança.</CardDescription></CardHeader>
                            <CardContent>
                                <Form {...form}>
                                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                        <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Nome</FormLabel><FormControl><Input {...field} placeholder="Nome do Cliente" /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField control={form.control} name="cpfCnpj" render={({ field }) => (<FormItem><FormLabel>CPF/CNPJ</FormLabel><FormControl><Input {...field} placeholder="000.000.000-00" /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email</FormLabel><FormControl><Input {...field} type="email" placeholder="cliente@email.com" /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField control={form.control} name="phone" render={({ field }) => (<FormItem><FormLabel>Celular (Opcional)</FormLabel><FormControl><Input {...field} placeholder="(XX) XXXXX-XXXX" /></FormControl><FormMessage /></FormItem>)} />
                                        
                                        <Separator className="my-6" />

                                        <FormField control={form.control} name="billingType" render={({ field }) => (
                                            <FormItem><FormLabel>Método de Pagamento</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}><FormControl>
                                                <SelectTrigger><SelectValue placeholder="Selecione o método" /></SelectTrigger>
                                            </FormControl><SelectContent>
                                                <SelectItem value="PIX">PIX</SelectItem>
                                                <SelectItem value="BOLETO">Boleto</SelectItem>
                                                <SelectItem value="CREDIT_CARD">Cartão de Crédito</SelectItem>
                                            </SelectContent></Select><FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField control={form.control} name="value" render={({ field }) => (<FormItem><FormLabel>Valor (R$)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>Descrição</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        
                                        <Button type="submit" disabled={isLoading} className="w-full">
                                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <QrCode className="mr-2 h-4 w-4"/>}
                                            Gerar Cobrança
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
                        {paymentApiResponse && renderPaymentResult()}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
