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
import { Loader2, ChevronLeft, ArrowRight, UserPlus, XCircle, QrCode, Barcode, Copy, CreditCard } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { createCustomer, createPayment, tokenizeCard, createSubscription } from '@/app/actions/checkout-actions';
import { Separator } from '@/components/ui/separator';

const customerFormSchema = z.object({
  name: z.string().min(3, 'O nome completo é obrigatório.'),
  email: z.string().email('O e-mail é obrigatório e deve ser válido.'),
  cpfCnpj: z.string().min(11, 'O CPF/CNPJ é obrigatório.'),
});
type CustomerDataFormValues = z.infer<typeof customerFormSchema>;

const tokenizationFormSchema = z.object({
    holderName: z.string().min(3, 'Nome no cartão obrigatório.'),
    number: z.string().min(16, 'Número do cartão inválido.').max(19, 'Número do cartão inválido.'),
    expiryMonth: z.string().min(1, 'Mês inválido.').max(2, 'Mês inválido.'),
    expiryYear: z.string().min(4, 'Ano inválido.').max(4, 'Ano inválido.'),
    ccv: z.string().min(3, 'CCV inválido.').max(4, 'CCV inválido.'),
    customerPhone: z.string().min(10, 'Telefone do titular obrigatório.'),
    customerPostalCode: z.string().min(8, 'CEP do titular obrigatório.'),
    customerAddressNumber: z.string().min(1, 'Número do endereço obrigatório.'),
});
type TokenizationFormValues = z.infer<typeof tokenizationFormSchema>;

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

    const tokenizationForm = useForm<TokenizationFormValues>({
        resolver: zodResolver(tokenizationFormSchema),
        defaultValues: { holderName: '', number: '', expiryMonth: '', expiryYear: '', ccv: '', customerPhone: '', customerPostalCode: '', customerAddressNumber: ''},
    });
    
    useEffect(() => {
        if (!isUserLoading) {
            if (!user) { router.push('/login'); }
            else if (userProfile) {
                const defaultValues = {
                    name: userProfile.fullName || '',
                    email: userProfile.email || '',
                    cpfCnpj: userProfile.taxId || '',
                };
                customerForm.reset(defaultValues);

                if (userProfile.asaasCustomerId) {
                    setCreatedCustomer({ id: userProfile.asaasCustomerId, ...defaultValues });
                    setStep('payment');
                }
            }
        }
    }, [user, userProfile, isUserLoading, router, customerForm]);

    const handleDataSubmit = async (data: CustomerDataFormValues) => {
        setIsLoading(true);
        setApiResponse(null);
        try {
            if (!user) throw new Error("Usuário não autenticado.");
            const result = await createCustomer(user.uid, data);
            setApiResponse({ status: 'success', data: result });
            setCreatedCustomer(result);
            toast({ title: 'Dados validados!', description: 'Agora escolha o método de pagamento.' });
            setStep('payment');
        } catch (err: any) {
            setApiResponse({ status: 'error', data: { message: err.message } });
            toast({ title: "Erro ao validar dados", description: err.message, variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    const handlePixBoletoSubmit = async (billingType: 'PIX' | 'BOLETO') => {
        if (!createdCustomer?.id || !user?.uid) return;
        setIsLoading(true);
        setApiResponse(null);
        try {
            const result = await createPayment({
                billingType,
                value: totalAmount,
                planName,
                billingCycle: isYearly ? 'yearly' : 'monthly',
                customerId: createdCustomer.id,
                userId: user.uid,
            });
            setApiResponse({ status: 'success', data: result });
            toast({ title: `Cobrança ${billingType} Gerada!`, description: 'Aguardando confirmação do pagamento.' });
            localStorage.setItem(`pendingChargeId_${user.uid}`, result.chargeId);
        } catch (err: any) {
            setApiResponse({ status: 'error', data: { message: err.message } });
            toast({ title: "Erro ao Gerar Cobrança", description: err.message, variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    }

    const handleCardSubmit = async (data: TokenizationFormValues) => {
        if (!createdCustomer?.id || !user?.uid) return;
        setIsLoading(true);
        setApiResponse(null);
        try {
            const tokenResult = await tokenizeCard({
                ...data,
                customerId: createdCustomer.id,
                customerName: createdCustomer.name,
                customerEmail: createdCustomer.email,
                customerCpfCnpj: createdCustomer.cpfCnpj,
            });
            setApiResponse({ status: 'success', data: tokenResult });

            const subscriptionResult = await createSubscription({
                value: totalAmount,
                planName,
                billingCycle: isYearly ? 'yearly' : 'monthly',
                customerId: createdCustomer.id,
                userId: user.uid,
                creditCardToken: tokenResult.creditCardToken,
            });
            setApiResponse({ status: 'success', data: subscriptionResult });
            router.push('/checkout/success');

        } catch (err: any) {
             setApiResponse({ status: 'error', data: { message: err.message } });
             toast({ title: "Erro no Pagamento com Cartão", description: err.message, variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };
    
    const formatCardNumber = (value: string) => value.replace(/\s/g, '').replace(/(\d{4})/g, '$1 ').trim();
    const handleCopy = (text: string) => { navigator.clipboard.writeText(text); toast({ title: 'Copiado!' }); };

    if (isUserLoading || !userProfile || !planName || !plansConfig[planName]) {
        return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>;
    }

    const planDetails = plansConfig[planName];
    const monthlyPrice = isYearly ? planDetails.yearlyPrice : planDetails.monthlyPrice;
    const totalAmount = isYearly ? monthlyPrice * 12 : monthlyPrice;
    const periodText = isYearly ? `R$ ${totalAmount.toFixed(2)} cobrado anualmente` : `R$ ${monthlyPrice.toFixed(2)} por mês`;
    
    const renderPaymentResult = () => {
        if (apiResponse?.status !== 'success' || !['PIX', 'BOLETO'].includes(apiResponse.data.type)) return null;
        const data = apiResponse.data;
        return (
            <div className='mt-6 space-y-4 animate-in fade-in-50'>
                <Separator />
                {data.type === 'PIX' && data.encodedImage && (
                    <div className='flex flex-col items-center gap-4 pt-4'>
                        <h3 className='font-semibold'>Escaneie para pagar com PIX</h3>
                        <div className="p-2 bg-white rounded-lg border">
                            <img src={`data:image/png;base64,${data.encodedImage}`} alt="PIX QR Code" width={180} height={180} />
                        </div>
                        <Button onClick={() => handleCopy(data.payload)} variant="outline" className='w-full'><Copy className="mr-2 h-4 w-4" /> Copiar Código</Button>
                    </div>
                )}
                 {data.type === 'BOLETO' && data.identificationField && (
                    <div className='space-y-3 pt-4'>
                        <h3 className='font-semibold'>Pague seu Boleto</h3>
                         <div className="p-3 border rounded-lg bg-muted text-sm break-all font-mono">{data.identificationField}</div>
                        <Button onClick={() => handleCopy(data.identificationField)} variant="outline" className='w-full'><Copy className="mr-2 h-4 w-4" /> Copiar Linha Digitável</Button>
                        <Button asChild variant="secondary" className="w-full"><a href={data.bankSlipUrl} target="_blank" rel="noopener noreferrer"><Barcode className="mr-2 h-4 w-4" /> Ver Boleto em PDF</a></Button>
                    </div>
                )}
                <p className='text-xs text-muted-foreground text-center pt-2'>Após o pagamento, a página será atualizada automaticamente.</p>
            </div>
        )
    };

    const renderDataStep = () => (
        <Card>
            <CardHeader><CardTitle>Confirme seus Dados</CardTitle><CardDescription>Informações necessárias para a emissão da cobrança.</CardDescription></CardHeader>
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
            <CardHeader><CardTitle>Escolha o Pagamento</CardTitle><CardDescription>Selecione a forma de pagamento de sua preferência.</CardDescription></CardHeader>
            <CardContent>
                <Tabs defaultValue="card" className="w-full">
                    <TabsList className="grid w-full grid-cols-3"><TabsTrigger value="card">Cartão</TabsTrigger><TabsTrigger value="pix">PIX</TabsTrigger><TabsTrigger value="boleto">Boleto</TabsTrigger></TabsList>
                    <TabsContent value="card" className='pt-6'>
                         <Form {...tokenizationForm}>
                             <form onSubmit={tokenizationForm.handleSubmit(handleCardSubmit)} className="space-y-4">
                                <FormField control={tokenizationForm.control} name="holderName" render={({ field }) => (<FormItem><FormLabel>Nome no Cartão</FormLabel><FormControl><Input placeholder="Como está no cartão" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                <FormField control={tokenizationForm.control} name="number" render={({ field }) => (<FormItem><FormLabel>Número do Cartão</FormLabel><FormControl><Input placeholder="0000 0000 0000 0000" {...field} onChange={(e) => field.onChange(formatCardNumber(e.target.value))} maxLength={19}/></FormControl><FormMessage /></FormItem>)}/>
                                <div className='grid grid-cols-3 gap-4'>
                                    <FormField control={tokenizationForm.control} name="expiryMonth" render={({ field }) => (<FormItem><FormLabel>Mês</FormLabel><FormControl><Input placeholder="MM" {...field} maxLength={2} /></FormControl><FormMessage /></FormItem>)}/>
                                    <FormField control={tokenizationForm.control} name="expiryYear" render={({ field }) => (<FormItem><FormLabel>Ano</FormLabel><FormControl><Input placeholder="AAAA" {...field} maxLength={4} /></FormControl><FormMessage /></FormItem>)}/>
                                    <FormField control={tokenizationForm.control} name="ccv" render={({ field }) => (<FormItem><FormLabel>CCV</FormLabel><FormControl><Input placeholder="123" {...field} maxLength={4} /></FormControl><FormMessage /></FormItem>)}/>
                                </div>
                                <Separator className="!my-6"/>
                                <h4 className="font-semibold text-sm">Informações do Titular</h4>
                                <FormField control={tokenizationForm.control} name="customerPhone" render={({ field }) => (<FormItem><FormLabel>Celular</FormLabel><FormControl><Input placeholder="(00) 00000-0000" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                <div className='grid grid-cols-3 gap-4'>
                                    <FormField control={tokenizationForm.control} name="customerPostalCode" render={({ field }) => (<FormItem className="col-span-1"><FormLabel>CEP</FormLabel><FormControl><Input placeholder="00000-000" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                    <FormField control={tokenizationForm.control} name="customerAddressNumber" render={({ field }) => (<FormItem className="col-span-2"><FormLabel>Número</FormLabel><FormControl><Input placeholder="123" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                </div>
                                <Button type="submit" disabled={isLoading} className="w-full !mt-6"><CreditCard className="mr-2 h-4 w-4"/> Finalizar Assinatura</Button>
                             </form>
                         </Form>
                    </TabsContent>
                    <TabsContent value="pix" className='pt-6 text-center space-y-4'><p className='text-sm text-muted-foreground'>Gere um QR Code para pagar via PIX. A confirmação é instantânea.</p><Button onClick={() => handlePixBoletoSubmit('PIX')} disabled={isLoading} className='w-full'><QrCode className="mr-2 h-4 w-4"/> Gerar PIX</Button>{renderPaymentResult()}</TabsContent>
                    <TabsContent value="boleto" className='pt-6 text-center space-y-4'><p className='text-sm text-muted-foreground'>Gere um boleto para pagamento. A confirmação pode levar até 2 dias úteis.</p><Button onClick={() => handlePixBoletoSubmit('BOLETO')} disabled={isLoading} className='w-full'><Barcode className="mr-2 h-4 w-4"/> Gerar Boleto</Button>{renderPaymentResult()}</TabsContent>
                </Tabs>
            </CardContent>
            <CardFooter className="flex-col sm:flex-row gap-2">
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
