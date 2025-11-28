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
import { Loader2, ChevronLeft, ArrowRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import Link from 'next/link';
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

type CheckoutStep = 'data' | 'payment';

// Plan Config
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
                if (userProfile.asaasCustomerId) { setAsaasCustomerId(userProfile.asaasCustomerId); }
            }
        }
    }, [user, userProfile, isUserLoading, router, customerForm]);

    if (isUserLoading || !userProfile || !planName || !plansConfig[planName]) {
        return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>;
    }
    
    const planDetails = plansConfig[planName];
    const monthlyPrice = isYearly ? planDetails.yearlyPrice : planDetails.monthlyPrice;
    const totalAmount = isYearly ? monthlyPrice * 12 : monthlyPrice;
    const periodText = isYearly ? `R$ ${totalAmount.toFixed(2)} cobrado anualmente` : '/mês';

    const handleDataSubmit = async (data: CustomerDataFormValues) => {
        setIsLoading(true);
        try {
            if (!user) throw new Error("Usuário não autenticado.");

            if (customerForm.formState.isDirty) {
                await onProfileUpdate(data);
                toast({ title: "Dados atualizados!" });
            }

            const response = await fetch('/api/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.uid, customerData: data }),
            });
            
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'Falha ao criar cliente no gateway de pagamento.');
            }
            
            setAsaasCustomerId(result.asaasCustomerId);
            setStep('payment');
            toast({ title: 'Cliente criado com sucesso!', description: 'Agora escolha o método de pagamento.'});
            console.log("Customer created/found, new Asaas ID:", result.asaasCustomerId);


        } catch (err: any) {
            toast({ title: "Erro ao verificar dados", description: err.message, variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
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
                <p>Próxima etapa: Formulário de Pagamento aqui.</p>
            </CardContent>
            <CardFooter className="flex-col sm:flex-row gap-2">
                <Button variant="outline" className="w-full" onClick={() => setStep('data')}>Voltar</Button>
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
