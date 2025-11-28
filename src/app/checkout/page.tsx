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
import { Loader2, ChevronLeft, CreditCard, QrCode, Barcode, CheckCircle, ArrowRight, Copy } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import Link from 'next/link';
import { createCustomer, tokenizeCardAndCreateSubscription } from '@/app/actions/checkout-actions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { createPaymentAction } from '@/app/admin/asaas-test/actions'; // Reusing test action for PIX/Boleto
import { verifyAndFinalizeSubscription } from '@/app/actions/billing-actions';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';


// Schemas
const customerFormSchema = z.object({
  fullName: z.string().min(3, 'O nome completo é obrigatório.'),
  email: z.string().email('O e-mail é obrigatório e deve ser válido.'),
  phone: z.string().min(10, 'O celular é obrigatório.'),
  taxId: z.string().min(11, 'O CPF/CNPJ é obrigatório.'),
  postalCode: z.string().min(8, "CEP inválido.").optional(),
  address: z.string().min(3, "Endereço inválido.").optional(),
  addressNumber: z.string().min(1, "Número inválido.").optional(),
  complement: z.string().optional(),
  province: z.string().min(2, "Bairro inválido.").optional(),
});
type CustomerDataFormValues = z.infer<typeof customerFormSchema>;

const cardFormSchema = z.object({
    holderName: z.string().min(3, 'O nome no cartão é obrigatório.'),
    email: z.string().email('O e-mail do titular é obrigatório.'),
    number: z.string().min(16, 'O número do cartão é inválido.').max(19, 'O número do cartão é inválido.'),
    expiry: z.string().regex(/^(0[1-9]|1[0-2])\s?\/?\s?(\d{2})$/, 'Data de validade inválida (MM/AA).'),
    ccv: z.string().min(3, 'CCV inválido.').max(4, 'CCV inválido.'),
});
type CardFormValues = z.infer<typeof cardFormSchema>;

type CheckoutStep = 'data' | 'payment';

// Plan Config
const plansConfig = {
  PREMIUM: { name: 'Premium', monthlyPrice: 29.90, yearlyPrice: 23.90 },
  PROFISSIONAL: { name: 'Profissional', monthlyPrice: 49.90, yearlyPrice: 39.90 },
};

// Helper Functions
const formatCardNumber = (value: string) => value.replace(/\D/g, '').replace(/(\d{4})/g, '$1 ').trim();
const formatExpiry = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 2) return cleaned;
    return `${cleaned.slice(0, 2)} / ${cleaned.slice(2, 4)}`;
};

function CheckoutPageContent() {
    const { user, userProfile, isUserLoading, onProfileUpdate } = useUser();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();

    const [step, setStep] = useState<CheckoutStep>('data');
    const [isLoading, setIsLoading] = useState(false);
    const [asaasCustomerId, setAsaasCustomerId] = useState<string | null>(null);
    const [paymentResult, setPaymentResult] = useState<any>(null);

    const planName = searchParams.get('plan')?.toUpperCase() as keyof typeof plansConfig;
    const isYearly = searchParams.get('yearly') === 'true';

    const customerForm = useForm<CustomerDataFormValues>({
        resolver: zodResolver(customerFormSchema),
        defaultValues: {
            fullName: '', email: '', phone: '', taxId: '', postalCode: '',
            address: '', addressNumber: '', complement: '', province: '',
        }
    });

    const cardForm = useForm<CardFormValues>({
        resolver: zodResolver(cardFormSchema),
        defaultValues: { holderName: '', email: '', number: '', expiry: '', ccv: '' },
    });
    
    useEffect(() => {
        if (!isUserLoading) {
            if (!user) { router.push('/login'); }
            else if (userProfile) {
                customerForm.reset({
                    fullName: userProfile.fullName || '', email: userProfile.email || '',
                    phone: userProfile.phone || '', taxId: userProfile.taxId || '',
                    postalCode: userProfile.postalCode || '', address: userProfile.address || '',
                    addressNumber: userProfile.addressNumber || '', complement: userProfile.complement || '',
                    province: userProfile.province || '',
                });
                cardForm.reset({ ...cardForm.getValues(), email: userProfile.email || '' });
                if (userProfile.asaasCustomerId) { setAsaasCustomerId(userProfile.asaasCustomerId); }
            }
        }
    }, [user, userProfile, isUserLoading, router, customerForm, cardForm]);
    
    // Polling effect for PIX/Boleto
    useEffect(() => {
        if (paymentResult?.type === 'PIX' && paymentResult?.chargeId) {
            const chargeId = paymentResult.chargeId;
            const interval = setInterval(async () => {
                try {
                    const result = await verifyAndFinalizeSubscription(user!.uid, chargeId);
                    if (result.success) {
                        clearInterval(interval);
                        router.push('/checkout/success');
                    }
                } catch (err) {
                    console.error("Polling error:", err);
                }
            }, 5000); // Poll every 5 seconds
            return () => clearInterval(interval);
        }
    }, [paymentResult, user, router]);

    if (isUserLoading || !userProfile || !planName || !plansConfig[planName]) {
        return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>;
    }
    
    const planDetails = plansConfig[planName];
    const monthlyPrice = isYearly ? planDetails.yearlyPrice : planDetails.monthlyPrice;
    const totalAmount = isYearly ? monthlyPrice * 12 : monthlyPrice;
    const cycle = isYearly ? 'YEARLY' : 'MONTHLY';
    const finalPrice = isYearly ? totalAmount / 12 : monthlyPrice;
    const periodText = isYearly ? `R$ ${totalAmount.toFixed(2)} cobrado anualmente` : '/mês';

    const handleDataSubmit = async (data: CustomerDataFormValues) => {
        setIsLoading(true);
        try {
            if (!user) throw new Error("Usuário não autenticado.");

            if (customerForm.formState.isDirty) {
                await onProfileUpdate(data);
                toast({ title: "Dados atualizados!" });
            }
            
            if (!asaasCustomerId) {
                const customerResult = await createCustomer({ userId: user.uid, customerData: data });
                if (!customerResult.success || !customerResult.asaasCustomerId) {
                    throw new Error(customerResult.message);
                }
                setAsaasCustomerId(customerResult.asaasCustomerId);
            }
            setStep('payment');
        } catch (err: any) {
            toast({ title: "Erro ao verificar dados", description: err.message, variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleCardPaymentSubmit = async (data: CardFormValues) => {
        setIsLoading(true);
        toast({ title: 'Processando...', description: 'Aguarde enquanto validamos seu pagamento.' });
        
        try {
            if (!asaasCustomerId || !user) throw new Error('Dados do cliente ou usuário ausentes.');
            
            const [expiryMonth, expiryYearPartial] = data.expiry.split(' / ');
            const expiryYear = `20${expiryYearPartial}`;

            const result = await tokenizeCardAndCreateSubscription({
                asaasCustomerId,
                card: { ...data, number: data.number.replace(/\s/g, ''), expiryMonth, expiryYear },
                holderInfo: {
                    name: data.holderName,
                    email: data.email,
                    cpfCnpj: customerForm.getValues('taxId'),
                    postalCode: customerForm.getValues('postalCode') || '',
                    addressNumber: customerForm.getValues('addressNumber') || '',
                    phone: customerForm.getValues('phone') || '',
                },
                subscription: {
                    value: finalPrice,
                    cycle: cycle,
                    description: `Assinatura Plano ${planDetails.name} - ${isYearly ? 'Anual' : 'Mensal'}`,
                    userId: user.uid,
                    planName,
                }
            });

            if (result.success) {
                router.push('/checkout/success');
            } else { throw new Error(result.message); }

        } catch (err: any) {
             toast({ title: 'Erro no Pagamento', description: err.message, variant: 'destructive' });
        } finally { setIsLoading(false); }
    };
    
    const handleOneTimePayment = async (billingType: 'PIX' | 'BOLETO') => {
        if (!asaasCustomerId || !user) {
            toast({ title: 'Erro', description: 'Dados do cliente ou usuário não identificados.' });
            return;
        }
        setIsLoading(true);
        setPaymentResult(null);
        try {
            const result = await createPaymentAction({
                billingType,
                value: totalAmount,
                planName,
                billingCycle: isYearly ? 'yearly' : 'monthly',
                customerId: asaasCustomerId,
                userId: user.uid,
            });
            setPaymentResult(result);
            if (billingType === 'PIX') {
                localStorage.setItem(`pendingChargeId_${user.uid}`, result.chargeId);
            }
        } catch (error: any) {
            toast({ title: 'Erro ao gerar cobrança', description: error.message, variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        toast({ title: 'Copiado!' });
    };

    const renderDataStep = () => (
        <Card>
            <CardHeader>
              <CardTitle>Confirme seus Dados</CardTitle>
              <CardDescription>Estas informações são necessárias para a cobrança e emissão de notas fiscais.</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...customerForm}>
                    <form onSubmit={customerForm.handleSubmit(handleDataSubmit)} id="customer-data-form" className="space-y-4">
                        <FormField control={customerForm.control} name="fullName" render={({ field }) => (<FormItem><FormLabel>Nome Completo</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={customerForm.control} name="email" render={({ field }) => (<FormItem><FormLabel>E-mail</FormLabel><FormControl><Input type="email" {...field} disabled /></FormControl><FormMessage /></FormItem>)} />
                        <Separator />
                        <p className="text-sm font-medium">Informações de Cobrança</p>
                        <FormField control={customerForm.control} name="phone" render={({ field }) => (<FormItem><FormLabel>Celular</FormLabel><FormControl><Input {...field} placeholder="(XX) XXXXX-XXXX" /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={customerForm.control} name="taxId" render={({ field }) => (<FormItem><FormLabel>CPF/CNPJ</FormLabel><FormControl><Input {...field} placeholder="000.000.000-00" /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={customerForm.control} name="postalCode" render={({ field }) => (<FormItem><FormLabel>CEP</FormLabel><FormControl><Input {...field} placeholder="00000-000" /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={customerForm.control} name="address" render={({ field }) => (<FormItem><FormLabel>Endereço</FormLabel><FormControl><Input {...field} placeholder="Rua, Avenida, etc."/></FormControl><FormMessage /></FormItem>)} />
                         <div className="grid grid-cols-3 gap-4">
                            <FormField control={customerForm.control} name="addressNumber" render={({ field }) => (
                                <FormItem className='col-span-1'><FormLabel>Número</FormLabel><FormControl><Input {...field} placeholder="123" /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={customerForm.control} name="complement" render={({ field }) => (
                                <FormItem className='col-span-2'><FormLabel>Complemento</FormLabel><FormControl><Input {...field} placeholder="Apto, Bloco, etc." /></FormControl><FormMessage /></FormItem>
                            )}/>
                        </div>
                        <FormField control={customerForm.control} name="province" render={({ field }) => (
                            <FormItem><FormLabel>Bairro</FormLabel><FormControl><Input {...field} placeholder="Seu bairro" /></FormControl><FormMessage /></FormItem>
                        )}/>
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
                <Tabs defaultValue="credit_card">
                    <TabsList className="grid w-full grid-cols-3"><TabsTrigger value="credit_card"><CreditCard className="mr-2 h-4 w-4"/>Cartão</TabsTrigger><TabsTrigger value="pix"><QrCode className="mr-2 h-4 w-4"/>PIX</TabsTrigger><TabsTrigger value="boleto"><Barcode className="mr-2 h-4 w-4"/>Boleto</TabsTrigger></TabsList>
                    <TabsContent value="credit_card" className="pt-6">
                        <Form {...cardForm}><form onSubmit={cardForm.handleSubmit(handleCardPaymentSubmit)} id="card-payment-form" className="space-y-4">
                            <FormField control={cardForm.control} name="holderName" render={({ field }) => (<FormItem><FormLabel>Nome no Cartão</FormLabel><FormControl><Input placeholder="Como está no cartão" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={cardForm.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email do Titular</FormLabel><FormControl><Input type="email" placeholder="email@dominio.com" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={cardForm.control} name="number" render={({ field }) => (<FormItem><FormLabel>Número do Cartão</FormLabel><FormControl><Input type="tel" placeholder="0000 0000 0000 0000" {...field} onChange={(e) => field.onChange(formatCardNumber(e.target.value))} maxLength={19}/></FormControl><FormMessage /></FormItem>)} />
                            <div className="grid grid-cols-2 gap-4">
                                <FormField control={cardForm.control} name="expiry" render={({ field }) => (<FormItem><FormLabel>Validade (MM/AA)</FormLabel><FormControl><Input placeholder="MM / AA" {...field} onChange={(e) => field.onChange(formatExpiry(e.target.value))} maxLength={7}/></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={cardForm.control} name="ccv" render={({ field }) => (<FormItem><FormLabel>CCV</FormLabel><FormControl><Input placeholder="123" {...field} maxLength={4} /></FormControl><FormMessage /></FormItem>)} />
                            </div>
                        </form></Form>
                    </TabsContent>
                    <TabsContent value="pix" className="pt-6">
                        {paymentResult?.type === 'PIX' ? (
                            <div className='flex flex-col items-center gap-4 text-center'>
                                <h3 className='font-semibold'>Escaneie o QR Code para pagar</h3>
                                <div className="p-2 bg-white rounded-lg border"><img src={`data:image/png;base64,${paymentResult.encodedImage}`} alt="PIX QR Code" width={200} height={200} /></div>
                                <Button onClick={() => handleCopy(paymentResult.payload)} variant="outline" className='w-full'><Copy className="mr-2 h-4 w-4" /> Copiar Código PIX</Button>
                                <p className='text-sm text-muted-foreground'>Aguardando confirmação do pagamento...</p>
                            </div>
                        ) : (<Button onClick={() => handleOneTimePayment('PIX')} disabled={isLoading} className="w-full">{isLoading ? <Loader2 className="animate-spin mr-2" /> : <QrCode className="mr-2 h-4 w-4"/>}Gerar QR Code PIX</Button>)}
                    </TabsContent>
                    <TabsContent value="boleto" className="pt-6">
                        {paymentResult?.type === 'BOLETO' ? (
                            <div className='space-y-4 text-center'>
                                <h3 className='font-semibold'>Boleto Gerado</h3>
                                <div className="p-3 border rounded-lg bg-muted text-sm break-all">{paymentResult.identificationField}</div>
                                <Button onClick={() => handleCopy(paymentResult.identificationField)} variant="outline" className='w-full'><Copy className="mr-2 h-4 w-4" /> Copiar Linha Digitável</Button>
                                <Button asChild variant="secondary" className="w-full"><a href={paymentResult.bankSlipUrl} target="_blank" rel="noopener noreferrer"><Barcode className="mr-2 h-4 w-4" /> Ver Boleto (PDF)</a></Button>
                            </div>
                        ) : (<Button onClick={() => handleOneTimePayment('BOLETO')} disabled={isLoading} className="w-full">{isLoading ? <Loader2 className="animate-spin mr-2" /> : <Barcode className="mr-2 h-4 w-4"/>}Gerar Boleto Bancário</Button>)}
                    </TabsContent>
                </Tabs>
            </CardContent>
            <CardFooter className="flex-col sm:flex-row gap-2">
                <Button variant="outline" className="w-full" onClick={() => { setStep('data'); setPaymentResult(null); }}>Voltar</Button>
                <Button form="card-payment-form" type="submit" className="w-full" disabled={isLoading}>{isLoading ? <Loader2 className="animate-spin" /> : `Assinar por R$ ${finalPrice.toFixed(2)}`}</Button>
            </CardFooter>
        </Card>
    );

    return (
        <AppLayout user={user} userProfile={userProfile} onProfileUpdate={onProfileUpdate}>
            <div className="container mx-auto max-w-4xl py-12">
                 <Button asChild variant="ghost" className="mb-8"><Link href="/pricing"><ChevronLeft className="mr-2 h-4 w-4"/> Voltar para os planos</Link></Button>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                    <div className={cn("md:sticky md:top-24 space-y-4", step === 'payment' && "hidden md:block")}>
                        <Card>
                            <CardHeader><CardTitle>Resumo do Pedido</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex justify-between"><span className="text-muted-foreground">Plano</span><span className="font-semibold">{planDetails.name}</span></div>
                                <div className="border-t pt-4 flex justify-between font-bold text-lg"><span>Total</span><span>R$ ${totalAmount.toFixed(2)}</span></div>
                                 <p className="text-sm text-muted-foreground">{periodText}</p>
                            </CardContent>
                        </Card>
                         <Card className={cn("transition-opacity duration-300", step === 'data' ? 'opacity-100' : 'opacity-50')}>
                             <CardHeader><CardTitle className='flex items-center gap-2'><CheckCircle className='h-5 w-5 text-primary'/> Dados do Cliente</CardTitle></CardHeader>
                         </Card>
                         <Card className={cn("transition-opacity duration-300", step === 'payment' ? 'opacity-100' : 'opacity-50')}>
                             <CardHeader><CardTitle className={cn('flex items-center gap-2', step === 'payment' && 'text-primary')}><CreditCard className='h-5 w-5'/> Pagamento</CardTitle></CardHeader>
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
