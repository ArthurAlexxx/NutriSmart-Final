// src/app/checkout/page.tsx
'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import AppLayout from '@/components/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Loader2, ChevronLeft, ArrowRight, UserPlus, XCircle, QrCode, Barcode, Copy, CreditCard, Crown, Briefcase } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { createCustomer, createPaymentAction } from '@/app/actions/checkout-actions';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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


type CheckoutStep = 'data' | 'payment';

const plansConfig = {
  PREMIUM: { name: 'Premium', monthlyPrice: 29.90, yearlyPrice: 23.90 },
  PROFISSIONAL: { name: 'Profissional', monthlyPrice: 49.90, yearlyPrice: 39.90 },
};

function CheckoutPageContent() {
    const { user, userProfile, isUserLoading, onProfileUpdate } = useUser();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();

    const [step, setStep] = useState<CheckoutStep>('data');
    const [isLoading, setIsLoading] = useState(false);
    const [apiResponse, setApiResponse] = useState<any>(null);
    const [createdCustomer, setCreatedCustomer] = useState<any>(null);

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

    useEffect(() => {
        if (!isUserLoading) {
            if (!user) {
                router.push('/login');
            } else if (userProfile) {
                customerForm.reset({
                    name: userProfile.fullName || '',
                    email: userProfile.email || '',
                    cpfCnpj: userProfile.taxId || '',
                });
                // Garante que o fluxo sempre comece na etapa de dados
                setStep('data');
            }
        }
    }, [user, userProfile, isUserLoading, router, customerForm]);

    const handleDataSubmit = async (data: CustomerDataFormValues) => {
        setIsLoading(true);
        setApiResponse(null);
        try {
            if (!user) throw new Error("Usuário não autenticado.");
            const result = await createCustomer(user.uid, data);
            setApiResponse({ status: 'success', data: result, type: 'customer' });
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
            toast({ title: "Erro", description: "Cliente ou usuário não identificado para criar a cobrança.", variant: 'destructive'});
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
            
            // Store pending charge ID in localStorage for client-side polling/verification
            localStorage.setItem(`pendingChargeId_${user.uid}`, result.chargeId);

            toast({ title: "Cobrança Criada!", description: `Sua cobrança de ${data.billingType} foi gerada. Efetue o pagamento para ativar a assinatura.` });
        } catch (error: any) {
            setApiResponse({ status: 'error', data: { message: error.message }, type: 'payment' });
            toast({ title: "Erro ao Criar Cobrança", description: error.message, variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    }
    
    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        toast({ title: 'Copiado!' });
    }

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
        const TitleIcon = apiResponse.status === 'success' ? UserPlus : XCircle;

        if (apiResponse.type === 'customer') {
            return (
                <Card>
                    <CardHeader><CardTitle className={`flex items-center gap-2 ${cardTitleClass}`}><TitleIcon/> Sucesso na Requisição</CardTitle></CardHeader>
                    <CardContent><ScrollArea className="h-48 w-full rounded-md border bg-secondary/30 p-4"><pre className="text-sm whitespace-pre-wrap">{JSON.stringify(apiResponse?.data, null, 2)}</pre></ScrollArea></CardContent>
                </Card>
            );
        }

        if (apiResponse.type === 'payment' && apiResponse.status === 'success') {
             return (
                <Card>
                    <CardHeader><CardTitle className={`flex items-center gap-2 ${cardTitleClass}`}>Cobrança Gerada</CardTitle></CardHeader>
                    <CardContent>
                        <div className='space-y-4'>
                            {apiResponse.data.type === 'PIX' && apiResponse.data.encodedImage && (
                                <div className='flex flex-col items-center gap-4'>
                                    <h3 className='font-semibold'>Escaneie para pagar com PIX</h3>
                                    <div className="p-2 bg-white rounded-lg border"><img src={`data:image/png;base64,${apiResponse.data.encodedImage}`} alt="PIX QR Code" width={150} height={150} /></div>
                                    <Button onClick={() => handleCopy(apiResponse.data.payload)} variant="outline" className='w-full'><Copy className="mr-2 h-4 w-4" /> Copiar Código</Button>
                                    <p className="text-sm text-muted-foreground text-center">Após o pagamento, sua assinatura será ativada automaticamente.</p>
                                </div>
                            )}
                             {apiResponse.data.type === 'BOLETO' && apiResponse.data.identificationField && (
                                <div className='space-y-3'>
                                    <h3 className='font-semibold'>Boleto</h3>
                                     <div className="p-3 border rounded-lg bg-muted text-sm break-all">{apiResponse.data.identificationField}</div>
                                    <Button onClick={() => handleCopy(apiResponse.data.identificationField)} variant="outline" className='w-full'><Copy className="mr-2 h-4 w-4" /> Copiar Linha Digitável</Button>
                                    <Button asChild variant="secondary" className="w-full"><a href={apiResponse.data.bankSlipUrl} target="_blank" rel="noopener noreferrer"><Barcode className="mr-2 h-4 w-4" /> Ver PDF</a></Button>
                                    <p className="text-sm text-muted-foreground text-center">A confirmação pode levar até 2 dias úteis. Sua assinatura será ativada após a confirmação.</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            );
        }
        
        // Error card
        return (
             <Card>
                <CardHeader><CardTitle className={`flex items-center gap-2 ${cardTitleClass}`}><XCircle/> Erro na Requisição</CardTitle></CardHeader>
                <CardContent><ScrollArea className="h-48 w-full rounded-md border bg-secondary/30 p-4"><pre className="text-sm whitespace-pre-wrap">{JSON.stringify(apiResponse?.data, null, 2)}</pre></ScrollArea></CardContent>
            </Card>
        );
    };

    const renderDataStep = () => (
        <Card>
            <CardHeader><CardTitle>1. Confirme seus Dados</CardTitle><CardDescription>Informações necessárias para a emissão da cobrança.</CardDescription></CardHeader>
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
        <Card>
            <CardHeader><CardTitle>2. Escolha o Pagamento</CardTitle><CardDescription>Selecione a forma de pagamento de sua preferência.</CardDescription></CardHeader>
            <CardContent>
                 <Tabs defaultValue="pix-boleto" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="pix-boleto">PIX / Boleto</TabsTrigger>
                        <TabsTrigger value="cartao" disabled>Cartão de Crédito</TabsTrigger>
                    </TabsList>
                    <TabsContent value="pix-boleto" className="pt-6">
                        <Form {...paymentForm}>
                             <form onSubmit={paymentForm.handleSubmit(handlePaymentSubmit)} className="space-y-6">
                                <FormField control={paymentForm.control} name="billingType" render={({ field }) => (
                                    <FormItem className="space-y-3"><FormLabel>Forma de Pagamento</FormLabel><FormControl>
                                        <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex gap-4">
                                            <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="PIX" id="pix" /></FormControl><Label htmlFor="pix" className='flex items-center gap-2'><QrCode/> PIX</Label></FormItem>
                                            <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="BOLETO" id="boleto" /></FormControl><Label htmlFor="boleto" className='flex items-center gap-2'><Barcode/> Boleto</Label></FormItem>
                                        </RadioGroup>
                                    </FormControl><FormMessage /></FormItem>
                                )}/>
                                <Button type="submit" disabled={isLoading} className="w-full"><CreditCard className="mr-2 h-4 w-4"/> Gerar Cobrança</Button>
                             </form>
                        </Form>
                    </TabsContent>
                    <TabsContent value="cartao">
                        {/* O formulário do cartão virá aqui */}
                    </TabsContent>
                 </Tabs>
            </CardContent>
             <CardFooter>
                <Button variant="outline" className="w-full" onClick={() => setStep('data')}>Voltar e Editar Dados</Button>
            </CardFooter>
        </Card>
    );

    return (
        <AppLayout user={user} userProfile={userProfile} onProfileUpdate={onProfileUpdate}>
            <div className="container mx-auto max-w-4xl py-12">
                 <Button asChild variant="ghost" className="mb-8"><Link href="/pricing"><ChevronLeft className="mr-2 h-4 w-4"/> Voltar para os planos</Link></Button>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                    <div className="space-y-4 md:sticky md:top-24">
                        <Card>
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
