// src/app/checkout/page.tsx
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import AppLayout from '@/components/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Loader2, User, ChevronLeft, CreditCard, ArrowRight, QrCode, Barcode, Copy, RefreshCw, XCircle, CheckCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { verifyAndFinalizeSubscription } from '@/app/actions/billing-actions';

const customerFormSchema = z.object({
  fullName: z.string().min(3, 'O nome completo é obrigatório.'),
  email: z.string().email('O e-mail é obrigatório e deve ser válido.'),
  phone: z.string().min(10, 'O celular é obrigatório.'),
  taxId: z.string().min(11, 'O CPF/CNPJ é obrigatório.'),
});
type CustomerDataFormValues = z.infer<typeof customerFormSchema>;

type PaymentMethod = 'PIX' | 'BOLETO' | 'CREDIT_CARD';
type CheckoutStep = 'data' | 'method' | 'payment';

const plansConfig = {
  PREMIUM: { name: 'Premium', price: 29.90, yearlyPrice: 23.90 },
  PROFISSIONAL: { name: 'Profissional', price: 49.90, yearlyPrice: 39.90 },
};

function CheckoutPageContent() {
    const { user, userProfile, isUserLoading, onProfileUpdate } = useUser();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();

    const [step, setStep] = useState<CheckoutStep>('data');
    const [isLoading, setIsLoading] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [paymentResult, setPaymentResult] = useState<any>(null);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CREDIT_CARD');
    const [error, setError] = useState<string | null>(null);

    const planName = searchParams.get('plan')?.toUpperCase() as keyof typeof plansConfig;
    const isYearly = searchParams.get('yearly') === 'true';

    const form = useForm<CustomerDataFormValues>({
        resolver: zodResolver(customerFormSchema),
        defaultValues: {
            fullName: '',
            email: '',
            phone: '',
            taxId: '',
        }
    });
    
    useEffect(() => {
        if (!isUserLoading) {
            if (!user) {
                router.push('/login');
            } else if (userProfile) {
                form.reset({
                    fullName: userProfile.fullName || '',
                    email: userProfile.email || '',
                    phone: userProfile.phone || '',
                    taxId: userProfile.taxId || '',
                });
            }
        }
    }, [user, userProfile, isUserLoading, router, form]);

    if (isUserLoading || !userProfile || !planName || !plansConfig[planName]) {
        return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>;
    }
    
    const planDetails = plansConfig[planName];
    const monthlyPrice = isYearly ? planDetails.yearlyPrice : planDetails.price;
    let totalAmount = isYearly ? monthlyPrice * 12 : monthlyPrice;

    if (paymentMethod === 'PIX') {
        totalAmount = Math.round(totalAmount * 1.10 * 100) / 100;
    }

    const periodText = isYearly ? 'anual' : 'mensal';

    const handleDataSubmit = async (data: CustomerDataFormValues) => {
        setIsLoading(true);
        if (form.formState.isDirty) {
            try {
                await onProfileUpdate(data);
                toast({ title: "Dados atualizados!" });
            } catch (e: any) {
                toast({ title: "Erro ao salvar dados", description: e.message, variant: "destructive" });
                setIsLoading(false);
                return;
            }
        }
        setIsLoading(false);
        setStep('method');
    };

    const generatePayment = async () => {
        setIsLoading(true);
        setError(null);
        try {
            if (!user) throw new Error("Usuário não autenticado.");

            const response = await fetch('/api/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.uid,
                    planName: planName,
                    isYearly: isYearly,
                    customerData: form.getValues(),
                    billingType: paymentMethod,
                }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Falha ao gerar a cobrança.');
            
            if (data.type === 'CREDIT_CARD') {
                window.location.href = data.url;
                return;
            }

            setPaymentResult(data);
            setStep('payment');
        } catch (err: any) {
            setError(err.message);
            toast({ title: 'Erro', description: err.message, variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleCheckPayment = async () => {
        if (!paymentResult?.id || isVerifying || !user) return;
        setIsVerifying(true);
        try {
            const result = await verifyAndFinalizeSubscription(user.uid, paymentResult.id);

            if (result.success) {
                router.push('/checkout/success');
            } else {
                 toast({ title: 'Aguardando Pagamento', description: 'O pagamento ainda está pendente ou não foi confirmado.' });
            }
        } catch (e: any) {
            toast({ title: 'Erro de Conexão', description: e.message, variant: 'destructive' });
        } finally {
            setIsVerifying(false);
        }
    };

    const handleCopyCode = (code: string) => {
        navigator.clipboard.writeText(code);
        toast({ title: 'Copiado para a área de transferência!' });
    };

    const renderStep = () => {
        switch (step) {
            case 'data':
                return (
                    <Card>
                        <CardHeader>
                            <CardTitle>Confirme seus Dados</CardTitle>
                            <CardDescription>Essas informações são necessárias para a cobrança.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(handleDataSubmit)} id="customer-data-form" className="space-y-4">
                                    <FormField control={form.control} name="fullName" render={({ field }) => (<FormItem><FormLabel>Nome Completo</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>E-mail</FormLabel><FormControl><Input type="email" {...field} disabled /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={form.control} name="phone" render={({ field }) => (<FormItem><FormLabel>Celular</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={form.control} name="taxId" render={({ field }) => (<FormItem><FormLabel>CPF/CNPJ</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                </form>
                            </Form>
                        </CardContent>
                        <CardFooter>
                            <Button form="customer-data-form" type="submit" className="w-full" disabled={isLoading}>{isLoading ? <Loader2 className="animate-spin" /> : 'Continuar'}</Button>
                        </CardFooter>
                    </Card>
                );
            case 'method':
                return (
                    <Card>
                        <CardHeader>
                            <CardTitle>Forma de Pagamento</CardTitle>
                            <CardDescription>Escolha como deseja pagar.</CardDescription>
                        </CardHeader>
                        <CardContent>
                           <RadioGroup defaultValue={paymentMethod} onValueChange={(value: PaymentMethod) => setPaymentMethod(value)} className="space-y-3">
                                <Label htmlFor="card" className={cn("flex items-center gap-4 rounded-lg border p-4 cursor-pointer hover:bg-accent", paymentMethod === 'CREDIT_CARD' && 'ring-2 ring-primary border-primary')}>
                                    <CreditCard className="h-6 w-6 text-primary" />
                                    <div><p className="font-semibold">Cartão de Crédito</p><p className="text-sm text-muted-foreground">Pagamento seguro e recorrente.</p></div>
                                    <RadioGroupItem value="CREDIT_CARD" id="card" className="ml-auto" />
                                </Label>
                                <Label htmlFor="pix" className={cn("flex items-center gap-4 rounded-lg border p-4 cursor-pointer hover:bg-accent", paymentMethod === 'PIX' && 'ring-2 ring-primary border-primary')}>
                                    <QrCode className="h-6 w-6 text-primary" />
                                    <div><p className="font-semibold">PIX</p><p className="text-sm text-muted-foreground">Pagamento único com +10% de taxa.</p></div>
                                    <RadioGroupItem value="PIX" id="pix" className="ml-auto" />
                                </Label>
                                <Label htmlFor="boleto" className={cn("flex items-center gap-4 rounded-lg border p-4 cursor-pointer hover:bg-accent", paymentMethod === 'BOLETO' && 'ring-2 ring-primary border-primary')}>
                                    <Barcode className="h-6 w-6 text-primary" />
                                    <div><p className="font-semibold">Boleto Bancário</p><p className="text-sm text-muted-foreground">Pagamento único, vencimento em 3 dias.</p></div>
                                    <RadioGroupItem value="BOLETO" id="boleto" className="ml-auto" />
                                </Label>
                            </RadioGroup>
                        </CardContent>
                        <CardFooter className="flex-col sm:flex-row gap-2">
                             <Button variant="outline" className="w-full" onClick={() => setStep('data')}>Voltar</Button>
                             <Button className="w-full" onClick={generatePayment} disabled={isLoading}>{isLoading ? <Loader2 className="animate-spin" /> : 'Gerar Cobrança'}</Button>
                        </CardFooter>
                    </Card>
                );
            case 'payment':
                if (paymentResult?.type === 'PIX') {
                    return (
                        <Card>
                            <CardHeader className="text-center">
                                <CardTitle>Pague com PIX</CardTitle>
                                <CardDescription>Escaneie o QR Code ou copie o código.</CardDescription>
                            </CardHeader>
                            <CardContent className="flex flex-col items-center gap-4">
                                <div className="p-4 bg-white rounded-lg border">
                                    <img src={`data:image/png;base64,${paymentResult.encodedImage}`} alt="PIX QR Code" width={200} height={200} />
                                </div>
                                <Button onClick={() => handleCopyCode(paymentResult.payload)} variant="outline" className="w-full"><Copy className="mr-2 h-4 w-4" /> Copiar Código PIX</Button>
                            </CardContent>
                             <CardFooter>
                                <Button onClick={handleCheckPayment} disabled={isVerifying} className="w-full">{isVerifying ? <Loader2 className="animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}Já Paguei, Verificar</Button>
                            </CardFooter>
                        </Card>
                    )
                }
                 if (paymentResult?.type === 'BOLETO') {
                    return (
                        <Card>
                            <CardHeader className="text-center">
                                <CardTitle>Pagamento com Boleto</CardTitle>
                                <CardDescription>Copie a linha digitável ou baixe o PDF.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="p-4 border rounded-lg w-full bg-secondary/30"><p className="text-sm font-medium">Linha Digitável</p><p className="text-sm break-all">{paymentResult.identificationField}</p></div>
                                <div className="grid grid-cols-2 gap-2 w-full">
                                    <Button onClick={() => handleCopyCode(paymentResult.identificationField)} variant="outline"><Copy className="mr-2 h-4 w-4" /> Copiar</Button>
                                    <Button asChild variant="secondary"><a href={paymentResult.bankSlipUrl} target="_blank" rel="noopener noreferrer"><Barcode className="mr-2 h-4 w-4" /> Ver Boleto</a></Button>
                                </div>
                            </CardContent>
                            <CardFooter>
                                <Button onClick={() => router.push('/dashboard')} className="w-full">Voltar para o Dashboard</Button>
                            </CardFooter>
                        </Card>
                    )
                 }
                return <p>Método de pagamento inválido.</p>
        }
    }

    return (
        <AppLayout user={user} userProfile={userProfile} onProfileUpdate={onProfileUpdate}>
            <div className="container mx-auto max-w-4xl py-12">
                 <Button asChild variant="ghost" className="mb-8">
                    <Link href="/pricing"><ChevronLeft className="mr-2 h-4 w-4"/> Voltar para os planos</Link>
                 </Button>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                    {/* Left: Order Summary */}
                    <div className="md:sticky md:top-24">
                        <Card>
                            <CardHeader>
                                <CardTitle>Resumo do Pedido</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Plano</span>
                                    <span className="font-semibold">{planDetails.name}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Ciclo</span>
                                    <span className="font-semibold capitalize">{periodText}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Valor {isYearly && paymentMethod !== 'CREDIT_CARD' ? 'mensal' : ''}</span>
                                    <span className="font-semibold">R$ {monthlyPrice.toFixed(2)}</span>
                                </div>
                                 <div className="border-t pt-4 flex justify-between font-bold text-lg">
                                    <span>Total</span>
                                    <span>R$ {totalAmount.toFixed(2)}</span>
                                </div>
                                {paymentMethod === 'PIX' && (
                                    <p className='text-xs text-muted-foreground text-right -mt-2'>(+10% taxa PIX)</p>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right: Checkout Steps */}
                    <div>
                        {renderStep()}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}

export default function CheckoutPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-16 w-16 animate-spin"/></div>}>
            <CheckoutPageContent />
        </Suspense>
    );
}
