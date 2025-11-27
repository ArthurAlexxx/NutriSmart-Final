// src/components/payment-modal.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Loader2, Copy, CheckCircle, ArrowRight, User as UserIcon, RefreshCw, Mail, Phone, Hash, QrCode, Barcode, CreditCard, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { type UserProfile } from '@/types/user';
import { Button } from './ui/button';
import { useUser } from '@/firebase';
import confetti from 'canvas-confetti';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from './ui/form';
import { Input } from './ui/input';
import { cn } from '@/lib/utils';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Label } from './ui/label';


const formSchema = z.object({
  fullName: z.string().min(3, 'O nome completo é obrigatório.'),
  email: z.string().email('O e-mail é obrigatório e deve ser válido.'),
  phone: z.string().min(10, 'O celular é obrigatório.'),
  taxId: z.string().min(11, 'O CPF/CNPJ é obrigatório.'),
});
type CustomerDataFormValues = z.infer<typeof formSchema>;

type PaymentMethod = 'PIX' | 'BOLETO' | 'CREDIT_CARD';

interface PaymentModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  plan: { name: string; price: string; yearlyPrice: string; };
  isYearly: boolean;
  userProfile: UserProfile;
}

export default function PaymentModal({ isOpen, onOpenChange, plan, isYearly, userProfile }: PaymentModalProps) {
  const [step, setStep] = useState<'form' | 'method' | 'result'>('form');
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'PENDING' | 'PAID' | 'ERROR'>('PENDING');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PIX');
  const [paymentResult, setPaymentResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastPlanName, setLastPlanName] = useState<string | null>(null);
  
  const { toast } = useToast();
  const { onProfileUpdate, user } = useUser();

  const form = useForm<CustomerDataFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: userProfile.fullName || '',
      email: userProfile.email || '',
      phone: userProfile.phone || '',
      taxId: userProfile.taxId || '',
    }
  });
  
  useEffect(() => {
    if (isOpen && (plan.name !== lastPlanName || form.formState.isSubmitSuccessful)) {
        form.reset({
            fullName: userProfile.fullName || '',
            email: userProfile.email || '',
            phone: userProfile.phone || '',
            taxId: userProfile.taxId || '',
        });
        setStep('form');
        setPaymentStatus('PENDING');
        setPaymentResult(null);
        setError(null);
        setIsLoading(false);
        setIsVerifying(false);
        setLastPlanName(plan.name);
    } else if (isOpen && paymentResult) {
        setStep('result');
    }
  }, [isOpen, userProfile, form, plan.name, lastPlanName, paymentResult]);


  const generatePayment = async (customerData: CustomerDataFormValues, billingType: PaymentMethod) => {
    setIsLoading(true);
    setError(null);

    try {
        if (!user) throw new Error("Usuário não autenticado.");
        
        const response = await fetch('/api/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: user.uid,
                planName: plan.name.toUpperCase(),
                isYearly: isYearly,
                customerData: customerData,
                billingType: billingType,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Falha ao gerar a cobrança. Verifique os dados e tente novamente.');
        }
        
        setPaymentResult(data);
        setStep('result');

    } catch (err: any) {
        setError(err.message);
        setPaymentStatus('ERROR');
        setStep('result'); // Show error in the result step
        toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
        setIsLoading(false);
    }
  };

  const handleFormSubmit = async (data: CustomerDataFormValues) => {
    const isProfileDirty = form.formState.isDirty;
    
    if (isProfileDirty) {
        setIsLoading(true);
        try {
            await onProfileUpdate({ fullName: data.fullName, phone: data.phone, taxId: data.taxId });
            toast({ title: "Dados atualizados!", description: "Suas informações foram salvas." });
        } catch(e: any) {
            console.error("Failed to update profile before payment", e);
            toast({ title: "Erro ao salvar dados", description: e.message || "Não foi possível atualizar seu perfil.", variant: "destructive"});
            setIsLoading(false);
            return;
        } finally {
            setIsLoading(false);
        }
    }
    setStep('method');
  }
  
  const handleMethodSubmit = async () => {
    const customerData = form.getValues();
    await generatePayment(customerData, paymentMethod);
  }


  const handleSuccessfulPayment = useCallback((paidChargeId: string) => {
    if (paymentStatus === 'PAID' || !user) return;
    
    setPaymentStatus('PAID');
    localStorage.setItem(`pendingChargeId_${user.uid}`, paidChargeId);

    confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, zIndex: 9999 });
    
    toast({
        title: "Pagamento Confirmado!",
        description: "Sua assinatura será ativada em instantes. Redirecionando...",
        duration: 4000,
    });
    
    setTimeout(() => onOpenChange(false), 3000);

  }, [onOpenChange, paymentStatus, toast, user]);
  
  const handleCheckPayment = useCallback(async () => {
    if (!paymentResult?.id || isVerifying || paymentStatus === 'PAID') return;

    setIsVerifying(true);
    try {
        const response = await fetch(`/api/checkout/${paymentResult.id}`);
        const data = await response.json();

        if (response.ok && data.status === 'PAID') {
            handleSuccessfulPayment(data.chargeId);
        } else if (!response.ok) {
            toast({ title: 'Erro ao Verificar', description: data.error || 'Não foi possível verificar o pagamento.', variant: 'destructive'});
        } else {
             toast({ title: 'Aguardando Pagamento', description: 'O pagamento ainda está pendente.' });
        }
    } catch (e: any) {
        console.error("Verification failed", e);
        toast({ title: 'Erro de Conexão', description: 'Não foi possível conectar ao servidor para verificar.', variant: 'destructive'});
    } finally {
        setIsVerifying(false);
    }
  }, [paymentResult?.id, isVerifying, handleSuccessfulPayment, toast, paymentStatus]);


  const handleCopyCode = (code: string) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    toast({ title: 'Código Copiado!', description: 'Você pode usar o código no seu banco.' });
  };

  const monthlyPrice = parseFloat(isYearly ? plan.yearlyPrice : plan.price);
  const totalAmount = isYearly ? monthlyPrice * 12 : monthlyPrice;
  const periodText = isYearly ? 'anual' : 'mensal';

  const renderContent = () => {
      if (paymentStatus === 'PAID') {
          return (
            <div className='flex flex-col items-center gap-4 text-green-600 animate-in fade-in'>
                <CheckCircle className="h-16 w-16" />
                <p className='text-xl font-bold'>Pagamento Aprovado!</p>
                <p className='text-sm text-muted-foreground max-w-xs'>Sua assinatura será atualizada em instantes. Você pode fechar esta janela.</p>
            </div>
          )
      }

       if (step === 'form') {
           return (
                <div className='w-full text-left'>
                    <DialogHeader className='mb-6'>
                        <DialogTitle className="text-2xl font-bold flex items-center gap-3"><UserIcon className="h-6 w-6 text-primary"/> Complete seus Dados</DialogTitle>
                        <DialogDescription>Precisamos de algumas informações para gerar a cobrança.</DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(handleFormSubmit)} id="customer-data-form" className="space-y-4">
                            <FormField control={form.control} name="fullName" render={({ field }) => (<FormItem><FormLabel className="flex items-center gap-2 text-sm"><UserIcon className="h-4 w-4"/> Nome Completo</FormLabel><FormControl><Input placeholder="Seu nome completo" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                            <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel className="flex items-center gap-2 text-sm"><Mail className="h-4 w-4"/> E-mail</FormLabel><FormControl><Input type="email" placeholder="seu@email.com" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                            <FormField control={form.control} name="phone" render={({ field }) => (<FormItem><FormLabel className="flex items-center gap-2 text-sm"><Phone className="h-4 w-4"/> Celular</FormLabel><FormControl><Input placeholder="(XX) XXXXX-XXXX" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                            <FormField control={form.control} name="taxId" render={({ field }) => (<FormItem><FormLabel className="flex items-center gap-2 text-sm"><Hash className="h-4 w-4"/> CPF/CNPJ</FormLabel><FormControl><Input placeholder="000.000.000-00" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                        </form>
                    </Form>
                </div>
           );
       }
       
       if (step === 'method') {
           return (
                <div className='w-full text-left'>
                    <DialogHeader className='mb-6'>
                        <DialogTitle className="text-2xl font-bold flex items-center gap-3"><CreditCard className="h-6 w-6 text-primary"/> Forma de Pagamento</DialogTitle>
                        <DialogDescription>Escolha como deseja pagar sua assinatura.</DialogDescription>
                    </DialogHeader>
                    <RadioGroup defaultValue={paymentMethod} onValueChange={(value: PaymentMethod) => setPaymentMethod(value)} className="space-y-3">
                        <Label htmlFor="pix" className={cn("flex items-center gap-4 rounded-lg border p-4 cursor-pointer hover:bg-accent", paymentMethod === 'PIX' && 'ring-2 ring-primary border-primary')}>
                            <QrCode className="h-6 w-6 text-primary"/>
                            <div><p className="font-semibold">PIX</p><p className="text-sm text-muted-foreground">Pagamento instantâneo com QR Code.</p></div>
                            <RadioGroupItem value="PIX" id="pix" className="ml-auto"/>
                        </Label>
                         <Label htmlFor="boleto" className={cn("flex items-center gap-4 rounded-lg border p-4 cursor-pointer hover:bg-accent", paymentMethod === 'BOLETO' && 'ring-2 ring-primary border-primary')}>
                            <Barcode className="h-6 w-6 text-primary"/>
                            <div><p className="font-semibold">Boleto Bancário</p><p className="text-sm text-muted-foreground">Vencimento em 3 dias úteis.</p></div>
                            <RadioGroupItem value="BOLETO" id="boleto" className="ml-auto"/>
                        </Label>
                         <Label htmlFor="card" className={cn("flex items-center gap-4 rounded-lg border p-4 cursor-pointer hover:bg-accent", paymentMethod === 'CREDIT_CARD' && 'ring-2 ring-primary border-primary')}>
                            <CreditCard className="h-6 w-6 text-primary"/>
                            <div><p className="font-semibold">Cartão de Crédito</p><p className="text-sm text-muted-foreground">Pague com link seguro do Asaas.</p></div>
                            <RadioGroupItem value="CREDIT_CARD" id="card" className="ml-auto"/>
                        </Label>
                    </RadioGroup>
                </div>
           )
       }

      if (step === 'result') {
          if (isLoading) {
              return <div className='flex flex-col items-center gap-4 text-muted-foreground animate-in fade-in'><Loader2 className="h-12 w-12 animate-spin text-primary" /><p>Gerando sua cobrança...</p></div>
          }
          if (error) {
              return <Alert variant="destructive" className='animate-in fade-in'><XCircle className="h-4 w-4" /><AlertTitle>Erro ao Gerar Cobrança</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>
          }
          if (paymentResult) {
            switch(paymentResult.type) {
                case 'PIX':
                    return <div className='flex flex-col items-center gap-4 animate-in fade-in w-full'>
                                <div className='p-4 bg-white rounded-lg border'><img src={`data:image/png;base64,${paymentResult.encodedImage}`} alt="PIX QR Code" width={200} height={200} /></div>
                                <Button onClick={() => handleCopyCode(paymentResult.payload)} variant="outline" className='w-full'><Copy className="mr-2 h-4 w-4" /> Copiar Código PIX</Button>
                           </div>
                case 'BOLETO':
                    return <div className="flex flex-col items-start gap-4 text-left w-full animate-in fade-in">
                                <div className="p-4 border rounded-lg w-full bg-secondary/30"><p className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 mb-2">Linha Digitável</p><p className="text-sm break-all">{paymentResult.identificationField}</p></div>
                                <div className='grid grid-cols-2 gap-2 w-full'>
                                    <Button onClick={() => handleCopyCode(paymentResult.identificationField)} variant="outline"><Copy className="mr-2 h-4 w-4" /> Copiar</Button>
                                    <Button asChild variant="secondary"><a href={paymentResult.bankSlipUrl} target="_blank" rel="noopener noreferrer"><Barcode className="mr-2 h-4 w-4" /> Ver Boleto</a></Button>
                                </div>
                            </div>
                case 'CREDIT_CARD':
                     return <div className="flex flex-col items-center gap-4 text-center w-full animate-in fade-in">
                                <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-2"><CreditCard className="h-8 w-8" /></div>
                                <h3 className="text-xl font-bold">Link de Pagamento Gerado</h3>
                                <p className="text-muted-foreground">Você será redirecionado para a página de pagamento segura do Asaas para finalizar sua compra.</p>
                                <Button asChild className="w-full mt-4"><a href={paymentResult.invoiceUrl} target="_blank" rel="noopener noreferrer"><ArrowRight className="mr-2 h-4 w-4" /> Pagar com Cartão</a></Button>
                            </div>
            }
          }
      }

      return null;
  }

  const renderFooter = () => {
      if (paymentStatus === 'PAID') return null;

      if (step === 'form') {
        return <Button form="customer-data-form" type="submit" disabled={isLoading} className='w-full'>{isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <ArrowRight className="mr-2 h-4 w-4" />}Continuar</Button>
      }
      
      if (step === 'method') {
        return <Button onClick={handleMethodSubmit} disabled={isLoading} className='w-full'>{isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <ArrowRight className="mr-2 h-4 w-4" />}Gerar Cobrança</Button>
      }

      if (step === 'result' && paymentResult?.type !== 'CREDIT_CARD') {
          return <Button onClick={handleCheckPayment} disabled={isVerifying} className="w-full">{isVerifying ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <RefreshCw className="mr-2 h-4 w-4" />}Já Paguei, Verificar</Button>
      }
      
      return <Button onClick={() => onOpenChange(false)} className='w-full'>Fechar</Button>
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md text-center p-0">
        <DialogHeader className='p-6 pb-2'>
            <DialogTitle className="text-2xl font-bold">Assinatura {plan.name}</DialogTitle>
        </DialogHeader>

        <div className="py-8 px-6 flex items-center justify-center min-h-[350px]">
          {renderContent()}
        </div>
        
        <div className='border-t'>
            <div className="bg-muted p-4">
                <div className='flex justify-between items-center'>
                     <p className='font-semibold'>Total</p>
                     <p className='text-sm text-muted-foreground capitalize'>{periodText}</p>
                </div>
                <p className='text-2xl font-bold text-primary text-left'>R$ {totalAmount.toFixed(2)}</p>
            </div>

             <DialogFooter className='p-6 pt-4'>
                {renderFooter()}
            </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
