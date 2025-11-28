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
import { Loader2, ChevronLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import Link from 'next/link';
import { createCustomer, tokenizeCardAndCreateSubscription } from '@/app/actions/checkout-actions';

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

const plansConfig = {
  PREMIUM: { name: 'Premium', monthlyPrice: 29.90, yearlyPrice: 23.90 },
  PROFISSIONAL: { name: 'Profissional', monthlyPrice: 49.90, yearlyPrice: 39.90 },
};

const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    const matches = cleaned.match(/(\d{1,4})/g);
    return matches ? matches.join(' ') : '';
};

const formatExpiry = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length >= 3) {
        return `${cleaned.slice(0, 2)} / ${cleaned.slice(2, 4)}`;
    }
    return cleaned;
}

function CheckoutPageContent() {
    const { user, userProfile, isUserLoading, onProfileUpdate } = useUser();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();

    const [step, setStep] = useState<CheckoutStep>('data');
    const [isLoading, setIsLoading] = useState(false);
    const [asaasCustomerId, setAsaasCustomerId] = useState<string | null>(null);

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
                cardForm.reset({
                    ...cardForm.getValues(),
                    email: userProfile.email || '',
                });
                if (userProfile.asaasCustomerId) {
                    setAsaasCustomerId(userProfile.asaasCustomerId);
                }
            }
        }
    }, [user, userProfile, isUserLoading, router, customerForm, cardForm]);

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
            
            const customerResult = await createCustomer({ userId: user.uid, customerData: data });
            if (!customerResult.success || !customerResult.asaasCustomerId) {
                throw new Error(customerResult.message);
            }

            setAsaasCustomerId(customerResult.asaasCustomerId);
            setStep('payment');
        } catch (err: any) {
            toast({ title: "Erro ao verificar dados", description: err.message, variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };
    
    const handlePaymentSubmit = async (data: CardFormValues) => {
        setIsLoading(true);
        toast({ title: 'Processando...', description: 'Aguarde enquanto validamos seu pagamento.' });
        
        try {
            if (!asaasCustomerId || !user) throw new Error('Dados do cliente ou usuário ausentes.');
            
            const [expiryMonth, expiryYearPartial] = data.expiry.split(' / ');
            const expiryYear = `20${expiryYearPartial}`;

            const result = await tokenizeCardAndCreateSubscription({
                asaasCustomerId,
                card: { ...data, expiryMonth, expiryYear },
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
            } else {
                throw new Error(result.message);
            }

        } catch (err: any) {
             toast({ title: 'Erro no Pagamento', description: err.message, variant: 'destructive' });
        } finally {
             setIsLoading(false);
        }
    };

    const renderStep = () => {
        switch (step) {
            case 'data':
                return (
                    <Card>
                        <CardHeader><CardTitle>Confirme seus Dados</CardTitle><CardDescription>Essas informações são necessárias para a cobrança.</CardDescription></CardHeader>
                        <CardContent>
                            <Form {...customerForm}><form onSubmit={customerForm.handleSubmit(handleDataSubmit)} id="customer-data-form" className="space-y-4">
                                <FormField control={customerForm.control} name="fullName" render={({ field }) => (<FormItem><FormLabel>Nome Completo</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={customerForm.control} name="email" render={({ field }) => (<FormItem><FormLabel>E-mail</FormLabel><FormControl><Input type="email" {...field} disabled /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={customerForm.control} name="phone" render={({ field }) => (<FormItem><FormLabel>Celular</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={customerForm.control} name="taxId" render={({ field }) => (<FormItem><FormLabel>CPF/CNPJ</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={customerForm.control} name="postalCode" render={({ field }) => (<FormItem><FormLabel>CEP</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={customerForm.control} name="address" render={({ field }) => (<FormItem><FormLabel>Endereço</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={customerForm.control} name="addressNumber" render={({ field }) => (<FormItem><FormLabel>Número</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />

                            </form></Form>
                        </CardContent>
                        <CardFooter><Button form="customer-data-form" type="submit" className="w-full" disabled={isLoading}>{isLoading ? <Loader2 className="animate-spin" /> : 'Continuar para Pagamento'}</Button></CardFooter>
                    </Card>
                );
            case 'payment':
                return (
                     <Card>
                        <CardHeader><CardTitle>Pagamento com Cartão</CardTitle><CardDescription>Insira os dados do seu cartão de crédito.</CardDescription></CardHeader>
                        <CardContent>
                            <Form {...cardForm}><form onSubmit={cardForm.handleSubmit(handlePaymentSubmit)} id="card-payment-form" className="space-y-4">
                                <FormField control={cardForm.control} name="holderName" render={({ field }) => (<FormItem><FormLabel>Nome no Cartão</FormLabel><FormControl><Input placeholder="Como está no cartão" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={cardForm.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email do Titular</FormLabel><FormControl><Input type="email" placeholder="email@dominio.com" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={cardForm.control} name="number" render={({ field }) => (<FormItem><FormLabel>Número do Cartão</FormLabel><FormControl><Input 
                                    type="tel"
                                    placeholder="0000 0000 0000 0000" 
                                    {...field}
                                    onChange={(e) => {
                                        const formatted = formatCardNumber(e.target.value);
                                        field.onChange(formatted);
                                    }}
                                    maxLength={19}
                                /></FormControl><FormMessage /></FormItem>)} />
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField control={cardForm.control} name="expiry" render={({ field }) => (<FormItem><FormLabel>Validade (MM/AA)</FormLabel><FormControl><Input
                                        placeholder="MM / AA" {...field}
                                        onChange={(e) => {
                                            const formatted = formatExpiry(e.target.value);
                                            field.onChange(formatted);
                                        }}
                                        maxLength={7}
                                    /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={cardForm.control} name="ccv" render={({ field }) => (<FormItem><FormLabel>CCV</FormLabel><FormControl><Input placeholder="123" {...field} maxLength={4} /></FormControl><FormMessage /></FormItem>)} />
                                </div>
                            </form></Form>
                        </CardContent>
                        <CardFooter className="flex-col sm:flex-row gap-2">
                             <Button variant="outline" className="w-full" onClick={() => setStep('data')}>Voltar</Button>
                             <Button form="card-payment-form" type="submit" className="w-full" disabled={isLoading}>{isLoading ? <Loader2 className="animate-spin" /> : `Assinar por R$ ${finalPrice.toFixed(2)}`}</Button>
                        </CardFooter>
                    </Card>
                );
        }
    }

    return (
        <AppLayout user={user} userProfile={userProfile} onProfileUpdate={onProfileUpdate}>
            <div className="container mx-auto max-w-4xl py-12">
                 <Button asChild variant="ghost" className="mb-8"><Link href="/pricing"><ChevronLeft className="mr-2 h-4 w-4"/> Voltar para os planos</Link></Button>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                    <div className="md:sticky md:top-24"><Card>
                        <CardHeader><CardTitle>Resumo do Pedido</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between"><span className="text-muted-foreground">Plano</span><span className="font-semibold">{planDetails.name}</span></div>
                            <div className="border-t pt-4 flex justify-between font-bold text-lg"><span>Total</span><span>R$ ${finalPrice.toFixed(2)}</span></div>
                             <p className="text-sm text-muted-foreground">{periodText}</p>
                        </CardContent>
                    </Card></div>
                    <div>{renderStep()}</div>
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
