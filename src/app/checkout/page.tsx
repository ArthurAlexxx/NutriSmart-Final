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
import { Loader2, ChevronLeft, ArrowRight, UserPlus, XCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { createCustomer } from '@/app/actions/checkout-actions';
import { ScrollArea } from '@/components/ui/scroll-area';

// Schemas
const customerFormSchema = z.object({
  name: z.string().min(3, 'O nome completo é obrigatório.'),
  email: z.string().email('O e-mail é obrigatório e deve ser válido.'),
  cpfCnpj: z.string().min(11, 'O CPF/CNPJ é obrigatório.'),
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
    const [apiResponse, setApiResponse] = useState<any>(null);
    const [createdCustomer, setCreatedCustomer] = useState<any>(null);

    const planName = searchParams.get('plan')?.toUpperCase() as keyof typeof plansConfig;
    const isYearly = searchParams.get('yearly') === 'true';

    const customerForm = useForm<CustomerDataFormValues>({
        resolver: zodResolver(customerFormSchema),
        defaultValues: {
            name: '', email: '', cpfCnpj: ''
        }
    });
    
    useEffect(() => {
        if (!isUserLoading) {
            if (!user) { router.push('/login'); }
            else if (userProfile) {
                customerForm.reset({
                    name: userProfile.fullName || '', 
                    email: userProfile.email || '',
                    cpfCnpj: userProfile.taxId || '',
                });
                if (userProfile.asaasCustomerId) { 
                    setCreatedCustomer({ id: userProfile.asaasCustomerId });
                    setStep('payment'); // Jump to payment if customer already exists
                }
            }
        }
    }, [user, userProfile, isUserLoading, router, customerForm]);

    if (isUserLoading || !userProfile || !planName || !plansConfig[planName]) {
        return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>;
    }
    
    const planDetails = plansConfig[planName];
    const monthlyPrice = isYearly ? planDetails.yearlyPrice : planDetails.monthlyPrice;
    const totalAmount = isYearly ? monthlyPrice * 12 : monthlyPrice;
    const periodText = isYearly ? `R$ ${totalAmount.toFixed(2)} cobrado anualmente` : `R$ ${monthlyPrice.toFixed(2)} por mês`;

    const handleDataSubmit = async (data: CustomerDataFormValues) => {
        setIsLoading(true);
        setApiResponse(null);
        try {
            if (!user) throw new Error("Usuário não autenticado.");

            const result = await createCustomer(user.uid, data);
            
            setApiResponse({ status: 'success', data: result, type: 'customer' });
            setCreatedCustomer(result);
            
            toast({ title: 'Tudo certo!', description: 'Seus dados foram validados. Agora escolha o método de pagamento.'});
            
            setTimeout(() => {
                setStep('payment');
            }, 1500);

        } catch (err: any) {
            setApiResponse({ status: 'error', data: { message: err.message } });
            toast({ title: "Erro ao verificar dados", description: err.message, variant: "destructive" });
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
                    <ScrollArea className="h-48 w-full rounded-md border bg-secondary/30 p-4">
                        <pre className="text-sm whitespace-pre-wrap">{JSON.stringify(apiResponse?.data, null, 2)}</pre>
                    </ScrollArea>
                </CardContent>
            </Card>
        );
    };

    const renderDataStep = () => (
        <Card>
            <CardHeader>
              <CardTitle>Confirme seus Dados</CardTitle>
              <CardDescription>Estas informações são necessárias para a cobrança.</CardDescription>
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
                    <div className="space-y-4">
                        <Card>
                            <CardHeader><CardTitle>Resumo do Pedido</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex justify-between"><span className="text-muted-foreground">Plano</span><span className="font-semibold">{planDetails.name}</span></div>
                                <div className="border-t pt-4 flex justify-between font-bold text-lg"><span>Total</span><span>{periodText}</span></div>
                            </CardContent>
                        </Card>
                        {apiResponse && renderResult()}
                    </div>
                    <div className='animate-in fade-in-50 duration-500'>
                        {step === 'data' && !createdCustomer ? renderDataStep() : renderPaymentStep()}
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
