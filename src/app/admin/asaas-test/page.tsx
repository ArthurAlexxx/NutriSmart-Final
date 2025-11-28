// src/app/admin/asaas-test/page.tsx
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import AppLayout from '@/components/app-layout';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, UserPlus, XCircle, QrCode, Barcode, Copy, CreditCard, Crown, Briefcase, RefreshCcw, Key } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { createCustomerAction, createPaymentAction, createSubscriptionAction, tokenizeCardAction } from './actions';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/firebase';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

const customerFormSchema = z.object({
  name: z.string().min(3, 'O nome é obrigatório.'),
  cpfCnpj: z.string().min(11, 'O CPF/CNPJ é obrigatório.'),
});
type CustomerFormValues = z.infer<typeof customerFormSchema>;

const paymentFormSchema = z.object({
    billingType: z.enum(['PIX', 'BOLETO'], { required_error: 'Selecione a forma de pagamento.'}),
    value: z.coerce.number().positive('O valor deve ser maior que zero.'),
    planName: z.enum(['PREMIUM', 'PROFISSIONAL'], { required_error: 'Selecione um plano.' }),
    billingCycle: z.enum(['monthly', 'yearly'], { required_error: 'Selecione um ciclo.' }),
});
type PaymentFormValues = z.infer<typeof paymentFormSchema>;

const subscriptionFormSchema = z.object({
    value: z.coerce.number().positive('O valor deve ser maior que zero.'),
    cycle: z.enum(['MONTHLY', 'YEARLY']),
});
type SubscriptionFormValues = z.infer<typeof subscriptionFormSchema>;

const tokenizationFormSchema = z.object({
    holderName: z.string().min(3, 'Nome no cartão obrigatório.'),
    number: z.string().min(16, 'Número do cartão inválido.').max(19, 'Número do cartão inválido.'),
    expiryMonth: z.string().min(2, 'Mês inválido.').max(2, 'Mês inválido.'),
    expiryYear: z.string().min(4, 'Ano inválido.').max(4, 'Ano inválido.'),
    ccv: z.string().min(3, 'CCV inválido.').max(4, 'CCV inválido.'),
    // Customer Info from createdCustomer state
    customerName: z.string(),
    customerEmail: z.string().email(),
    customerCpfCnpj: z.string(),
    customerPostalCode: z.string().min(8, 'CEP obrigatório.'),
    customerAddressNumber: z.string().min(1, 'Número do endereço obrigatório.'),
    customerPhone: z.string().min(10, 'Telefone obrigatório.'),
});
type TokenizationFormValues = z.infer<typeof tokenizationFormSchema>;


export default function AsaasTestPage() {
    const { user, userProfile, onProfileUpdate } = useUser();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [apiResponse, setApiResponse] = useState<any>(null);
    const [createdCustomer, setCreatedCustomer] = useState<any>(null);

    const customerForm = useForm<CustomerFormValues>({
        resolver: zodResolver(customerFormSchema),
        defaultValues: { name: '', cpfCnpj: '' },
    });

    const paymentForm = useForm<PaymentFormValues>({
        resolver: zodResolver(paymentFormSchema),
        defaultValues: { billingType: 'PIX', value: 1.00, planName: 'PREMIUM', billingCycle: 'monthly' },
    });

    const subscriptionForm = useForm<SubscriptionFormValues>({
        resolver: zodResolver(subscriptionFormSchema),
        defaultValues: { value: 1.00, cycle: 'MONTHLY' },
    });

    const tokenizationForm = useForm<TokenizationFormValues>({
        resolver: zodResolver(tokenizationFormSchema),
        defaultValues: { holderName: '', number: '', expiryMonth: '', expiryYear: '', ccv: ''},
    });
    
    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        toast({ title: 'Copiado!' });
    }

    const onCustomerSubmit = async (data: CustomerFormValues) => {
        setIsLoading(true);
        setApiResponse(null);
        setCreatedCustomer(null);

        try {
            const result = await createCustomerAction(data);
            setApiResponse({ status: 'success', data: result, type: 'customer' });
            setCreatedCustomer(result);
            toast({ title: "Cliente Criado!", description: `Agora você pode criar uma cobrança ou assinatura para ${result.name}.` });
        } catch (error: any) {
            setApiResponse({ status: 'error', data: { message: error.message } });
            toast({ title: "Erro ao Criar Cliente", description: error.message, variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };
    
    const onPaymentSubmit = async (data: PaymentFormValues) => {
        if (!createdCustomer?.id || !user?.uid) {
            toast({ title: "Erro", description: "Cliente ou usuário não identificado para criar a cobrança.", variant: 'destructive'});
            return;
        }

        setIsLoading(true);
        setApiResponse(null);
        try {
            const result = await createPaymentAction({ 
                ...data, 
                customerId: createdCustomer.id,
                userId: user.uid
            });
            setApiResponse({ status: 'success', data: result, type: 'payment' });
            toast({ title: "Cobrança Criada!", description: `Cobrança de ${data.billingType} gerada com sucesso.` });
        } catch (error: any) {
            setApiResponse({ status: 'error', data: { message: error.message } });
            toast({ title: "Erro ao Criar Cobrança", description: error.message, variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    }
    
    const onSubscriptionSubmit = async (data: SubscriptionFormValues) => {
         if (!createdCustomer?.id || !user?.uid) {
            toast({ title: "Erro", description: "Cliente ou usuário não identificado para criar a assinatura.", variant: 'destructive'});
            return;
        }

        setIsLoading(true);
        setApiResponse(null);
        try {
            const result = await createSubscriptionAction({ 
                ...data, 
                customerId: createdCustomer.id,
                userId: user.uid
            });
            setApiResponse({ status: 'success', data: result, type: 'subscription' });
            toast({ title: "Assinatura Criada!", description: `Assinatura no cartão de crédito criada com sucesso.` });
        } catch (error: any) {
            setApiResponse({ status: 'error', data: { message: error.message } });
            toast({ title: "Erro ao Criar Assinatura", description: error.message, variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    }

    const onTokenizationSubmit = async (data: TokenizationFormValues) => {
        if (!createdCustomer?.id) {
            toast({ title: "Erro", description: "Cliente não identificado para tokenizar o cartão.", variant: 'destructive'});
            return;
        }
        setIsLoading(true);
        setApiResponse(null);

        try {
            const result = await tokenizeCardAction({
                ...data,
                customerId: createdCustomer.id,
                // Populate holder info from the main user profile for the test
                customerName: userProfile?.fullName || '',
                customerEmail: userProfile?.email || '',
                customerCpfCnpj: userProfile?.taxId || '',
                customerPostalCode: userProfile?.postalCode || '99999-999',
                customerAddressNumber: userProfile?.addressNumber || '123',
                customerPhone: userProfile?.phone || '99999999999',
            });
             setApiResponse({ status: 'success', data: result, type: 'tokenization' });
             toast({ title: "Cartão Tokenizado!", description: "O token foi gerado com sucesso." });

        } catch (error: any) {
            setApiResponse({ status: 'error', data: { message: error.message } });
            toast({ title: "Erro ao Tokenizar", description: error.message, variant: 'destructive' });
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
                        <TitleIcon/> {apiResponse.status === 'success' ? 'Sucesso na Requisição' : 'Erro na Requisição'}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {apiResponse.type === 'payment' && apiResponse.status === 'success' ? (
                        <div className='space-y-4'>
                            {apiResponse.data.type === 'PIX' && apiResponse.data.encodedImage && (
                                <div className='flex flex-col items-center gap-4'>
                                    <h3 className='font-semibold'>QR Code PIX</h3>
                                    <div className="p-2 bg-white rounded-lg border">
                                        <img src={`data:image/png;base64,${apiResponse.data.encodedImage}`} alt="PIX QR Code" width={150} height={150} />
                                    </div>
                                    <Button onClick={() => handleCopy(apiResponse.data.payload)} variant="outline" className='w-full'>
                                        <Copy className="mr-2 h-4 w-4" /> Copiar Código
                                    </Button>
                                </div>
                            )}
                             {apiResponse.data.type === 'BOLETO' && apiResponse.data.identificationField && (
                                <div className='space-y-3'>
                                    <h3 className='font-semibold'>Boleto</h3>
                                     <div className="p-3 border rounded-lg bg-muted text-sm break-all">
                                        {apiResponse.data.identificationField}
                                    </div>
                                    <Button onClick={() => handleCopy(apiResponse.data.identificationField)} variant="outline" className='w-full'>
                                        <Copy className="mr-2 h-4 w-4" /> Copiar Linha Digitável
                                    </Button>
                                    <Button asChild variant="secondary" className="w-full">
                                        <a href={apiResponse.data.bankSlipUrl} target="_blank" rel="noopener noreferrer">
                                            <Barcode className="mr-2 h-4 w-4" /> Ver PDF
                                        </a>
                                    </Button>
                                </div>
                            )}
                        </div>
                    ) : (
                         <ScrollArea className="h-64 w-full rounded-md border bg-secondary/30 p-4">
                            <pre className="text-sm whitespace-pre-wrap">{JSON.stringify(apiResponse?.data, null, 2)}</pre>
                        </ScrollArea>
                    )}
                   
                </CardContent>
            </Card>
        );
    };

    return (
        <AppLayout user={user} userProfile={userProfile} onProfileUpdate={onProfileUpdate}>
            <div className="p-4 sm:p-6 lg:p-8 space-y-8">
                <PageHeader
                    icon={CreditCard}
                    title="Teste de API - Asaas"
                    description="Página para teste isolado da criação de clientes, cobranças e assinaturas na API do Asaas."
                />

                <div className='grid grid-cols-1 lg:grid-cols-2 gap-8 items-start'>
                    <div className='space-y-8'>
                        <Card>
                            <CardHeader>
                                <CardTitle className='flex items-center gap-2'><span className='flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground text-sm font-bold'>1</span> Criar Cliente</CardTitle>
                                <CardDescription>Primeiro, crie o cliente no Asaas.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Form {...customerForm}>
                                    <form onSubmit={customerForm.handleSubmit(onCustomerSubmit)} className="space-y-4">
                                        <FormField control={customerForm.control} name="name" render={({ field }) => (<FormItem><FormLabel>Nome</FormLabel><FormControl><Input {...field} placeholder="Nome do Cliente" /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField control={customerForm.control} name="cpfCnpj" render={({ field }) => (<FormItem><FormLabel>CPF/CNPJ</FormLabel><FormControl><Input {...field} placeholder="000.000.000-00" /></FormControl><FormMessage /></FormItem>)} />
                                        
                                        <Button type="submit" disabled={isLoading} className="w-full">
                                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4"/>}
                                            Criar Cliente
                                        </Button>
                                    </form>
                                </Form>
                            </CardContent>
                        </Card>
                        
                        {createdCustomer && (
                            <div className="space-y-8 animate-in fade-in-50 duration-500">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className='flex items-center gap-2'><span className='flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground text-sm font-bold'>2</span> Criar Cobrança Única</CardTitle>
                                        <CardDescription>Crie uma cobrança de PIX ou Boleto para <span className='font-bold text-foreground'>{createdCustomer.name}</span>.</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <Form {...paymentForm}>
                                            <form onSubmit={paymentForm.handleSubmit(onPaymentSubmit)} className="space-y-6">
                                                <FormField control={paymentForm.control} name="billingType" render={({ field }) => (
                                                    <FormItem className="space-y-3"><FormLabel>Forma de Pagamento</FormLabel><FormControl>
                                                        <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex gap-4">
                                                            <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="PIX" id="pix" /></FormControl><Label htmlFor="pix" className='flex items-center gap-2'><QrCode/> PIX</Label></FormItem>
                                                            <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="BOLETO" id="boleto" /></FormControl><Label htmlFor="boleto" className='flex items-center gap-2'><Barcode/> Boleto</Label></FormItem>
                                                        </RadioGroup>
                                                    </FormControl><FormMessage /></FormItem>
                                                )}/>
                                                <div className='grid grid-cols-2 gap-4'>
                                                    <FormField control={paymentForm.control} name="planName" render={({ field }) => (<FormItem><FormLabel>Plano</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl><SelectContent><SelectItem value="PREMIUM"><div className='flex items-center gap-2'><Crown /> Premium</div></SelectItem><SelectItem value="PROFISSIONAL"><div className='flex items-center gap-2'><Briefcase /> Profissional</div></SelectItem></SelectContent></Select><FormMessage /></FormItem>)}/>
                                                    <FormField control={paymentForm.control} name="billingCycle" render={({ field }) => (<FormItem><FormLabel>Ciclo</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl><SelectContent><SelectItem value="monthly">Mensal</SelectItem><SelectItem value="yearly">Anual</SelectItem></SelectContent></Select><FormMessage /></FormItem>)}/>
                                                </div>
                                                <FormField control={paymentForm.control} name="value" render={({ field }) => (<FormItem><FormLabel>Valor (R$)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                                <Button type="submit" disabled={isLoading} className="w-full"><CreditCard className="mr-2 h-4 w-4"/> Gerar Cobrança</Button>
                                            </form>
                                        </Form>
                                    </CardContent>
                                </Card>

                                <Card>
                                     <CardHeader>
                                        <CardTitle className='flex items-center gap-2'><span className='flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground text-sm font-bold'>3</span> Criar Assinatura (Cartão)</CardTitle>
                                        <CardDescription>Crie uma assinatura recorrente no cartão de crédito (sem token, para fins de teste da API).</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <Form {...subscriptionForm}>
                                            <form onSubmit={subscriptionForm.handleSubmit(onSubscriptionSubmit)} className="space-y-6">
                                                <div className='grid grid-cols-2 gap-4'>
                                                    <FormField control={subscriptionForm.control} name="value" render={({ field }) => (<FormItem><FormLabel>Valor (R$)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                                    <FormField control={subscriptionForm.control} name="cycle" render={({ field }) => (<FormItem><FormLabel>Ciclo</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl><SelectContent><SelectItem value="MONTHLY">Mensal</SelectItem><SelectItem value="YEARLY">Anual</SelectItem></SelectContent></Select><FormMessage /></FormItem>)}/>
                                                </div>
                                                <Button type="submit" disabled={isLoading} className="w-full"><RefreshCcw className="mr-2 h-4 w-4"/> Criar Assinatura</Button>
                                            </form>
                                        </Form>
                                    </CardContent>
                                </Card>

                                <Separator />

                                 <Card>
                                     <CardHeader>
                                        <CardTitle className='flex items-center gap-2'><span className='flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground text-sm font-bold'>4</span> Tokenizar Cartão</CardTitle>
                                        <CardDescription>Gere um token de cartão de crédito para usar na criação de assinaturas.</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <Form {...tokenizationForm}>
                                            <form onSubmit={tokenizationForm.handleSubmit(onTokenizationSubmit)} className="space-y-6">
                                                <FormField control={tokenizationForm.control} name="holderName" render={({ field }) => (<FormItem><FormLabel>Nome no Cartão</FormLabel><FormControl><Input placeholder="Como está no cartão" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                                <FormField control={tokenizationForm.control} name="number" render={({ field }) => (<FormItem><FormLabel>Número do Cartão</FormLabel><FormControl><Input placeholder="0000 0000 0000 0000" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                                <div className='grid grid-cols-3 gap-4'>
                                                    <FormField control={tokenizationForm.control} name="expiryMonth" render={({ field }) => (<FormItem><FormLabel>Mês</FormLabel><FormControl><Input placeholder="MM" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                                    <FormField control={tokenizationForm.control} name="expiryYear" render={({ field }) => (<FormItem><FormLabel>Ano</FormLabel><FormControl><Input placeholder="AAAA" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                                    <FormField control={tokenizationForm.control} name="ccv" render={({ field }) => (<FormItem><FormLabel>CCV</FormLabel><FormControl><Input placeholder="123" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                                </div>
                                                <p className="text-sm text-muted-foreground pt-2">O restante das informações do titular (nome, email, cpf, etc) será preenchido automaticamente com os dados do seu perfil de usuário logado para este teste.</p>
                                                <Button type="submit" disabled={isLoading} className="w-full"><Key className="mr-2 h-4 w-4"/> Gerar Token</Button>
                                            </form>
                                        </Form>
                                    </CardContent>
                                </Card>
                            </div>
                        )}
                    </div>

                    <div className='space-y-8 lg:sticky top-24'>
                        {apiResponse && renderResult()}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
