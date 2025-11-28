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
import { Loader2, UserPlus, XCircle, QrCode, Barcode, Copy, CreditCard } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { createCustomerAction, createPaymentAction } from './actions';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/firebase';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';

const customerFormSchema = z.object({
  name: z.string().min(3, 'O nome é obrigatório.'),
  cpfCnpj: z.string().min(11, 'O CPF/CNPJ é obrigatório.'),
});
type CustomerFormValues = z.infer<typeof customerFormSchema>;

const paymentFormSchema = z.object({
    billingType: z.enum(['PIX', 'BOLETO'], { required_error: 'Selecione a forma de pagamento.'}),
    value: z.coerce.number().positive('O valor deve ser maior que zero.'),
});
type PaymentFormValues = z.infer<typeof paymentFormSchema>;


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
        defaultValues: { billingType: 'PIX', value: 1.00 },
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
            toast({ title: "Cliente Criado!", description: `Agora você pode criar uma cobrança para ${result.name}.` });
        } catch (error: any) {
            setApiResponse({ status: 'error', data: { message: error.message } });
            toast({ title: "Erro ao Criar Cliente", description: error.message, variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };
    
    const onPaymentSubmit = async (data: PaymentFormValues) => {
        if (!createdCustomer?.id) return;
        setIsLoading(true);
        setApiResponse(null);
        try {
            const result = await createPaymentAction({ ...data, customerId: createdCustomer.id });
            setApiResponse({ status: 'success', data: result, type: 'payment' });
            toast({ title: "Cobrança Criada!", description: `Cobrança de ${data.billingType} gerada com sucesso.` });
        } catch (error: any) {
            setApiResponse({ status: 'error', data: { message: error.message } });
            toast({ title: "Erro ao Criar Cobrança", description: error.message, variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    }

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
                    description="Página para teste isolado da criação de clientes e cobranças na API do Asaas."
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
                            <Card className='animate-in fade-in-50 duration-500'>
                                <CardHeader>
                                     <CardTitle className='flex items-center gap-2'><span className='flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground text-sm font-bold'>2</span> Criar Cobrança</CardTitle>
                                     <CardDescription>Agora, crie uma cobrança de PIX ou Boleto para <span className='font-bold text-foreground'>{createdCustomer.name}</span>.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                     <Form {...paymentForm}>
                                        <form onSubmit={paymentForm.handleSubmit(onPaymentSubmit)} className="space-y-6">
                                            <FormField control={paymentForm.control} name="billingType" render={({ field }) => (
                                                <FormItem className="space-y-3"><FormLabel>Forma de Pagamento</FormLabel><FormControl>
                                                    <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex gap-4">
                                                        <FormItem className="flex items-center space-x-2 space-y-0">
                                                            <FormControl><RadioGroupItem value="PIX" id="pix" /></FormControl>
                                                            <Label htmlFor="pix" className='flex items-center gap-2'><QrCode/> PIX</Label>
                                                        </FormItem>
                                                        <FormItem className="flex items-center space-x-2 space-y-0">
                                                            <FormControl><RadioGroupItem value="BOLETO" id="boleto" /></FormControl>
                                                            <Label htmlFor="boleto" className='flex items-center gap-2'><Barcode/> Boleto</Label>
                                                        </FormItem>
                                                    </RadioGroup>
                                                </FormControl><FormMessage /></FormItem>
                                            )}/>
                                            <FormField control={paymentForm.control} name="value" render={({ field }) => (
                                                <FormItem><FormLabel>Valor (R$)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                                            )}/>

                                             <Button type="submit" disabled={isLoading} className="w-full">
                                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4"/>}
                                                Gerar Cobrança
                                            </Button>
                                        </form>
                                     </Form>
                                </CardContent>
                            </Card>
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
