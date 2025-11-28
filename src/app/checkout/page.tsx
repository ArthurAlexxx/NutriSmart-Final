// src/app/checkout/page.tsx
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import AppLayout from '@/components/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Loader2, ChevronLeft, ArrowRight, XCircle, QrCode, Barcode, Copy, CreditCard, RefreshCcw, Key, AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { createCustomer, createPaymentAction, tokenizeCardAction, createSubscriptionAction } from '@/app/actions/checkout-actions';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { verifyAndFinalizeSubscription } from '@/app/actions/billing-actions';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const customerFormSchema = z.object({
  name: z.string().min(3, 'O nome completo é obrigatório.'),
  email: z.string().email('O e-mail é obrigatório e deve ser válido.'),
  cpfCnpj: z.string().min(11, 'O CPF/CNPJ é obrigatório.'),
});
type CustomerDataFormValues = z.infer<typeof customerFormSchema>;

const paymentFormSchema = z.object({
    billingType: z.enum(['PIX', 'BOLETO'], { required_error: 'Selecione a forma de pagamento.'}),
});
type PaymentFormValues = z.infer<typeof paymentFormSchema>;

const tokenizationFormSchema = z.object({
    holderName: z.string().min(3, 'Nome no cartão obrigatório.'),
    number: z.string().min(16, 'Número do cartão inválido.').max(19, 'Número do cartão inválido.'),
    expiryMonth: z.string().min(1, 'Mês inválido.').max(2, 'Mês inválido.'),
    expiryYear: z.string().min(4, 'Ano inválido.').max(4, 'Ano inválido.'),
    ccv: z.string().min(3, 'CCV inválido.').max(4, 'CCV inválido.'),
    customerName: z.string().min(3, 'Nome do cliente obrigatório.'),
    customerEmail: z.string().email('Email do cliente obrigatório.'),
    customerCpfCnpj: z.string().min(11, 'CPF/CNPJ do cliente obrigatório.'),
    customerPostalCode: z.string().min(8, 'CEP do cliente obrigatório.'),
    customerAddressNumber: z.string().min(1, 'Número do endereço obrigatório.'),
    customerPhone: z.string().min(10, 'Telefone do cliente obrigatório.'),
});
type TokenizationFormValues = z.infer<typeof tokenizationFormSchema>;


type CheckoutStep = 'data' | 'payment';

const plansConfig = {
  PREMIUM: { name: 'Premium', monthlyPrice: 29.90, yearlyPrice: 23.90 },
  PROFISSIONAL: { name: 'Profissional', monthlyPrice: 49.90, yearlyPrice: 39.90 },
};

function CheckoutPageContent() {
    const { user, userProfile, isUserLoading, onProfileUpdate, effectiveSubscriptionStatus } = useUser();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();

    const [step, setStep] = useState<CheckoutStep>('data');
    const [isLoading, setIsLoading] = useState(false);
    const [apiResponse, setApiResponse] = useState<any>(null);
    const [createdCustomer, setCreatedCustomer] = useState<any>(null);
    const [isVerifying, setIsVerifying] = useState(false);
    const [isSubscribing, setIsSubscribing] = useState(false);

    const planName = searchParams.get('plan')?.toUpperCase() as keyof typeof plansConfig;
    const isYearly = searchParams.get('yearly') === 'true';

    const customerForm = useForm<CustomerDataFormValues>({
        resolver: zodResolver(customerFormSchema),
        defaultValues: { name: '', email: '', cpfCnpj: '' }
    });
    
    const paymentForm = useForm<PaymentFormValues>({
        resolver: zodResolver(paymentFormSchema),
        defaultValues: { billingType: 'PIX' },
    });
    
     const tokenizationForm = useForm<TokenizationFormValues>({
        resolver: zodResolver(tokenizationFormSchema),
        defaultValues: { 
            holderName: '', number: '', expiryMonth: '', expiryYear: '', ccv: '',
            customerName: '', customerEmail: '', customerCpfCnpj: '',
            customerPostalCode: '', customerAddressNumber: '', customerPhone: ''
        },
    });

    useEffect(() => {
        if (!isUserLoading && !user) {
            router.push('/login');
        }
        if (userProfile) {
             customerForm.reset({
                name: userProfile.fullName || '',
                email: userProfile.email || '',
                cpfCnpj: userProfile.taxId || '',
            });
            tokenizationForm.reset({
                ...tokenizationForm.getValues(),
                customerName: userProfile.fullName || '',
                customerEmail: userProfile.email || '',
                customerCpfCnpj: userProfile.taxId || '',
                customerPostalCode: userProfile.postalCode || '',
                customerAddressNumber: userProfile.addressNumber || '',
                customerPhone: userProfile.phone || '',
            });
        }
    }, [user, userProfile, isUserLoading, router, customerForm, tokenizationForm]);

    // This effect detects when a subscription is confirmed in the background
    // (via webhook) and redirects to the success page.
    useEffect(() => {
      const isPaidUser = effectiveSubscriptionStatus === 'premium' || effectiveSubscriptionStatus === 'professional';
      if (isPaidUser && localStorage.getItem('pendingChargeId')) {
        localStorage.removeItem('pendingChargeId');
        router.push('/checkout/success');
      }
    }, [effectiveSubscriptionStatus, router]);
    
    const handleDataSubmit = async (data: CustomerDataFormValues) => {
        setIsLoading(true);
        setApiResponse(null);
        try {
            if (!user) throw new Error("Usuário não autenticado.");
            
            const result = await createCustomer(user.uid, data);
            setCreatedCustomer(result);
            toast({ title: 'Dados validados!', description: 'Agora escolha o método de pagamento.' });
            setStep('payment');
        } catch (err: any) {
            setApiResponse({ status: 'error', data: { message: err.message }, type: 'customer' });
            toast({ title: "Erro ao validar dados", description: err.message, variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };
    
    const handlePaymentSubmit = async (data: PaymentFormValues) => {
        if (!createdCustomer?.id || !user?.uid) {
            toast({ title: "Erro", description: "Primeiro, confirme seus dados para criar um cliente de cobrança.", variant: 'destructive'});
            return;
        }

        setIsLoading(true);
        setApiResponse(null);

        const planDetails = plansConfig[planName];
        const monthlyPrice = isYearly ? planDetails.yearlyPrice : planDetails.monthlyPrice;
        const totalAmount = isYearly ? monthlyPrice * 12 : monthlyPrice;

        try {
            const result = await createPaymentAction({ 
                ...data,
                value: totalAmount,
                planName: planName,
                billingCycle: isYearly ? 'yearly' : 'monthly',
                customerId: createdCustomer.id,
                userId: user.uid
            });
            setApiResponse({ status: 'success', data: result, type: 'payment' });
            toast({ title: "Cobrança Criada!", description: `Sua cobrança de ${data.billingType} foi gerada. Efetue o pagamento para ativar a assinatura.` });
        } catch (error: any) {
            setApiResponse({ status: 'error', data: { message: error.message }, type: 'payment' });
            toast({ title: "Erro ao Criar Cobrança", description: error.message, variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    }
    
     const handleSubscriptionSubmit = async (data: TokenizationFormValues) => {
        if (!createdCustomer?.id || !user?.uid) {
            toast({ title: "Erro", description: "Primeiro, confirme seus dados para criar um cliente de cobrança.", variant: 'destructive' });
            return;
        }
        setIsSubscribing(true);
        setApiResponse(null);

        try {
            // 1. Tokenize o cartão
            const tokenResult = await tokenizeCardAction({ ...data, customerId: createdCustomer.id });
            
            if (!tokenResult?.creditCardToken) {
                throw new Error("Falha ao obter o token do cartão de crédito.");
            }
            toast({ title: "Cartão Validado", description: "Criando sua assinatura recorrente..." });

            // 2. Crie a assinatura com o token
            const planDetails = plansConfig[planName];
            const monthlyPrice = isYearly ? planDetails.yearlyPrice : planDetails.monthlyPrice;
            // No modo de assinatura, o valor deve ser o valor mensal/anual, não o total
            const subscriptionValue = isYearly ? planDetails.yearlyPrice * 12 : planDetails.monthlyPrice;

            const subscriptionResult = await createSubscriptionAction({
                value: subscriptionValue,
                planName: planName,
                billingCycle: isYearly ? 'yearly' : 'monthly',
                customerId: createdCustomer.id,
                userId: user.uid,
                creditCardToken: tokenResult.creditCardToken,
            });

            // The webhook will handle the redirect to the success page.
            // We'll show a waiting message here.
            setApiResponse({ status: 'success', data: subscriptionResult, type: 'subscription' });
            toast({ title: "Assinatura Criada!", description: "Aguardando confirmação do pagamento para ativar seu plano." });
            
            // Store the first charge ID to poll for status
            if (subscriptionResult?.payments?.[0]?.id) {
              localStorage.setItem('pendingChargeId', subscriptionResult.payments[0].id);
            }

        } catch (error: any) {
            setApiResponse({ status: 'error', data: { message: error.message }, type: 'subscription' });
            toast({ title: "Erro na Assinatura", description: error.message, variant: 'destructive' });
        } finally {
            setIsSubscribing(false);
        }
    };


    const handleVerifyPayment = async () => {
        if (!user || !apiResponse?.data?.chargeId) {
            toast({ title: "Erro", description: "Não foi possível encontrar os dados da cobrança para verificação.", variant: 'destructive' });
            return;
        }
        setIsVerifying(true);
        try {
            const result = await verifyAndFinalizeSubscription(user.uid, apiResponse.data.chargeId);
            if (result.success) {
                 router.push('/checkout/success');
            } else {
                toast({ title: "Pagamento Pendente", description: result.message, variant: 'default' });
            }
        } catch (error: any) {
            toast({ title: "Erro na Verificação", description: error.message, variant: 'destructive' });
        } finally {
            setIsVerifying(false);
        }
    };
    
    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        toast({ title: 'Copiado!' });
    }
    
    const formatCardNumber = (value: string) => {
        return value.replace(/\s/g, '').replace(/(\d{4})/g, '$1 ').trim();
    };

    const formatExpiryYear = (value: string) => {
        const cleaned = value.replace(/\D/g, '');
        if (cleaned.length === 2 && !cleaned.startsWith('20')) {
            return `20${cleaned}`;
        }
        return cleaned;
    };


    if (isUserLoading || !userProfile || !planName || !plansConfig[planName]) {
        return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>;
    }

    const planDetails = plansConfig[planName];
    const monthlyPrice = isYearly ? planDetails.yearlyPrice : planDetails.monthlyPrice;
    const totalAmount = isYearly ? monthlyPrice * 12 : monthlyPrice;
    const periodText = isYearly ? `R$ ${totalAmount.toFixed(2)} cobrado anualmente` : `R$ ${monthlyPrice.toFixed(2)} por mês`;
    
    const renderApiResponse = () => {
        if (!apiResponse) return null;

        const cardTitleClass = apiResponse.status === 'success' ? 'text-green-500' : 'text-destructive';
        
        if (apiResponse.status !== 'success') {
             return (
                 <Card className="shadow-sm">
                    <CardHeader><CardTitle className={`flex items-center gap-2 ${cardTitleClass}`}><XCircle/> Erro na Requisição</CardTitle></CardHeader>
                    <CardContent><ScrollArea className="h-48 w-full rounded-md border bg-secondary/30 p-4"><pre className="text-sm whitespace-pre-wrap">{JSON.stringify(apiResponse?.data, null, 2)}</pre></ScrollArea></CardContent>
                </Card>
             );
        }

        if (apiResponse.type === 'payment') {
             return (
                <Card className="shadow-sm">
                    <CardHeader><CardTitle className={`flex items-center gap-2 ${cardTitleClass}`}>Cobrança Gerada</CardTitle></CardHeader>
                    <CardContent className='space-y-4'>
                        <div className='space-y-4'>
                            {apiResponse.data.type === 'PIX' && apiResponse.data.encodedImage && (
                                <div className='flex flex-col items-center gap-4'>
                                    <h3 className='font-semibold'>Escaneie para pagar com PIX</h3>
                                    <div className="p-2 bg-white rounded-lg border"><img src={`data:image/png;base64,${apiResponse.data.encodedImage}`} alt="PIX QR Code" width={150} height={150} /></div>
                                    <Button onClick={() => handleCopy(apiResponse.data.payload)} variant="outline" className='w-full'><Copy className="mr-2 h-4 w-4" /> Copiar Código</Button>
                                </div>
                            )}
                             {apiResponse.data.type === 'BOLETO' && (
                                <div className='space-y-3'>
                                    <h3 className='font-semibold'>Boleto Gerado</h3>
                                     <p className='text-sm text-muted-foreground'>Clique no botão abaixo para abrir e imprimir seu boleto.</p>
                                    <Button asChild variant="secondary" className="w-full"><a href={apiResponse.data.bankSlipUrl} target="_blank" rel="noopener noreferrer"><Barcode className="mr-2 h-4 w-4" /> Ver PDF do Boleto</a></Button>
                                </div>
                            )}
                        </div>
                        <Alert variant="destructive" className="mt-4">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Atenção!</AlertTitle>
                            <AlertDescription>
                                Este código é único para esta transação. Se você recarregar a página, precisará gerar uma nova cobrança.
                            </AlertDescription>
                        </Alert>
                        <p className="text-sm text-muted-foreground text-center pt-2">Após o pagamento, sua assinatura será ativada. Se preferir, clique no botão abaixo para verificar.</p>
                         <Button onClick={handleVerifyPayment} disabled={isVerifying} className="w-full">
                            {isVerifying ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <RefreshCcw className="mr-2 h-4 w-4"/>}
                            Verificar Pagamento
                        </Button>
                    </CardContent>
                </Card>
            );
        }

        if (apiResponse.type === 'subscription' && apiResponse.status === 'success') {
            return (
                <Card className="shadow-sm">
                    <CardHeader><CardTitle className={`flex items-center gap-2 ${cardTitleClass}`}>Assinatura Criada</CardTitle></CardHeader>
                    <CardContent className="text-center space-y-4">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                        <p className="text-muted-foreground">Sua assinatura foi criada com sucesso! Estamos aguardando a confirmação do pagamento da primeira parcela para ativar seu plano.</p>
                        <p className="text-xs text-muted-foreground">Você pode fechar esta tela. A ativação é automática.</p>
                    </CardContent>
                </Card>
            );
        }
        
        return null;
    };

    const renderDataStep = () => (
        <Card className='shadow-lg'>
            <CardHeader>
                <CardTitle className="flex items-center gap-3">
                    <span className='flex items-center justify-center h-7 w-7 rounded-full bg-primary text-primary-foreground text-sm font-bold'>1</span>
                    Confirme seus Dados
                </CardTitle>
                <CardDescription>Informações necessárias para a emissão da cobrança.</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...customerForm}>
                    <form onSubmit={customerForm.handleSubmit(handleDataSubmit)} id="customer-data-form" className="space-y-4">
                        <FormField control={customerForm.control} name="name" render={({ field }) => (<FormItem><FormLabel>Nome Completo</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={customerForm.control} name="email" render={({ field }) => (<FormItem><FormLabel>E-mail</FormLabel><FormControl><Input type="email" {...field} disabled /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={customerForm.control} name="cpfCnpj" render={({ field }) => (<FormItem><FormLabel>CPF/CNPJ</FormLabel><FormControl><Input {...field} placeholder="000.000.000-00" /></FormControl><FormMessage /></FormItem>)} />
                    </form>
                </Form>
            </CardContent>
            <CardFooter><Button form="customer-data-form" type="submit" className="w-full" disabled={isLoading}>{isLoading ? <Loader2 className="animate-spin" /> : 'Continuar para Pagamento'}<ArrowRight className="ml-2 h-4 w-4" /></Button></CardFooter>
        </Card>
    );

    const renderPaymentStep = () => (
        <Card className='shadow-lg'>
            <CardHeader>
                <CardTitle className="flex items-center gap-3">
                     <span className='flex items-center justify-center h-7 w-7 rounded-full bg-primary text-primary-foreground text-sm font-bold'>2</span>
                    Escolha o Pagamento
                </CardTitle>
                <CardDescription>Selecione a forma de pagamento de sua preferência.</CardDescription>
            </CardHeader>
            <CardContent>
                 <Tabs defaultValue="pix-boleto" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="pix-boleto">PIX / Boleto</TabsTrigger>
                        <TabsTrigger value="cartao">Cartão de Crédito</TabsTrigger>
                    </TabsList>
                    <TabsContent value="pix-boleto" className="pt-6">
                        <Form {...paymentForm}>
                             <form onSubmit={paymentForm.handleSubmit(handlePaymentSubmit)} className="space-y-6">
                                <fieldset disabled={isSubscribing}>
                                    <FormField control={paymentForm.control} name="billingType" render={({ field }) => (
                                        <FormItem className="space-y-3"><FormLabel>Forma de Pagamento</FormLabel><FormControl>
                                            <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex gap-4">
                                                <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="PIX" id="pix" /></FormControl><Label htmlFor="pix" className='flex items-center gap-2'><QrCode/> PIX</Label></FormItem>
                                                <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="BOLETO" id="boleto" /></FormControl><Label htmlFor="boleto" className='flex items-center gap-2'><Barcode/> Boleto</Label></FormItem>
                                            </RadioGroup>
                                        </FormControl><FormMessage /></FormItem>
                                    )}/>
                                    <Button type="submit" disabled={isLoading} className="w-full mt-6"><CreditCard className="mr-2 h-4 w-4"/> Gerar Cobrança</Button>
                                </fieldset>
                             </form>
                        </Form>
                    </TabsContent>
                    <TabsContent value="cartao" className="pt-6">
                        <Form {...tokenizationForm}>
                             <form onSubmit={tokenizationForm.handleSubmit(handleSubscriptionSubmit)} className="space-y-6">
                                <fieldset disabled={isSubscribing}>
                                    <FormField control={tokenizationForm.control} name="holderName" render={({ field }) => (<FormItem><FormLabel>Nome no Cartão</FormLabel><FormControl><Input placeholder="Como está no cartão" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                    <FormField control={tokenizationForm.control} name="number" render={({ field }) => (<FormItem><FormLabel>Número do Cartão</FormLabel><FormControl><Input 
                                        type="tel" placeholder="0000 0000 0000 0000" {...field}
                                        onChange={(e) => { field.onChange(formatCardNumber(e.target.value)); }}
                                        maxLength={19}
                                    /></FormControl><FormMessage /></FormItem>)}/>
                                    <div className='grid grid-cols-3 gap-4'>
                                        <FormField control={tokenizationForm.control} name="expiryMonth" render={({ field }) => (<FormItem><FormLabel>Mês</FormLabel><FormControl><Input placeholder="MM" {...field} maxLength={2} /></FormControl><FormMessage /></FormItem>)}/>
                                        <FormField control={tokenizationForm.control} name="expiryYear" render={({ field }) => (<FormItem><FormLabel>Ano</FormLabel><FormControl><Input 
                                            placeholder="AAAA" {...field} 
                                            onChange={(e) => { field.onChange(formatExpiryYear(e.target.value)); }}
                                            maxLength={4} 
                                        /></FormControl><FormMessage /></FormItem>)}/>
                                        <FormField control={tokenizationForm.control} name="ccv" render={({ field }) => (<FormItem><FormLabel>CCV</FormLabel><FormControl><Input placeholder="123" {...field} maxLength={4} /></FormControl><FormMessage /></FormItem>)}/>
                                    </div>
                                    <Separator />
                                    <h4 className="font-semibold">Informações do Titular (para validação)</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <FormField control={tokenizationForm.control} name="customerName" render={({ field }) => (<FormItem><FormLabel>Nome</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                        <FormField control={tokenizationForm.control} name="customerEmail" render={({ field }) => (<FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} disabled /></FormControl><FormMessage /></FormItem>)}/>
                                        <FormField control={tokenizationForm.control} name="customerCpfCnpj" render={({ field }) => (<FormItem><FormLabel>CPF/CNPJ</FormLabel><FormControl><Input {...field} disabled /></FormControl><FormMessage /></FormItem>)}/>
                                        <FormField control={tokenizationForm.control} name="customerPostalCode" render={({ field }) => (<FormItem><FormLabel>CEP</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                        <FormField control={tokenizationForm.control} name="customerAddressNumber" render={({ field }) => (<FormItem><FormLabel>Número</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                        <FormField control={tokenizationForm.control} name="customerPhone" render={({ field }) => (<FormItem><FormLabel>Telefone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                    </div>
                                    <Button type="submit" disabled={isSubscribing} className="w-full"><RefreshCcw className="mr-2 h-4 w-4"/> Assinar com Cartão</Button>
                                </fieldset>
                            </form>
                        </Form>
                    </TabsContent>
                 </Tabs>
            </CardContent>
             <CardFooter>
                <Button variant="outline" className="w-full" onClick={() => setStep('data')} disabled={isSubscribing}>Voltar e Editar Dados</Button>
            </CardFooter>
        </Card>
    );

    return (
        <AppLayout user={user} userProfile={userProfile} onProfileUpdate={onProfileUpdate}>
            <div className="container mx-auto max-w-6xl py-12 px-4 sm:px-6 lg:px-8">
                 <div className="mb-8">
                    <Button asChild variant="ghost"><Link href="/pricing"><ChevronLeft className="mr-2 h-4 w-4"/> Voltar para os planos</Link></Button>
                 </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-16 items-start">
                    <div className="space-y-6 md:sticky md:top-28">
                        <Card className='shadow-lg'>
                            <CardHeader><CardTitle>Resumo do Pedido</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex justify-between"><span className="text-muted-foreground">Plano</span><span className="font-semibold">{planDetails.name}</span></div>
                                <div className="border-t pt-4 flex justify-between font-bold text-lg"><span>Total</span><span>{periodText}</span></div>
                            </CardContent>
                        </Card>
                         <div className='animate-in fade-in-50 duration-500'>
                            {renderApiResponse()}
                         </div>
                    </div>
                    <div className='animate-in fade-in-50 duration-500'>
                        {step === 'data' ? renderDataStep() : renderPaymentStep()}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}

export default function CheckoutPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-16 w-16 animate-spin text-primary"/></div>}>
            <CheckoutPageContent />
        </Suspense>
    );
}
