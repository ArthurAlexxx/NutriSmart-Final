// src/components/pix-payment-modal.tsx
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Loader2, Copy, Clock, CheckCircle, Save, ArrowRight, User as UserIcon, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { type UserProfile } from '@/types/user';
import { Button } from './ui/button';
import { useUser } from '@/firebase';
import confetti from 'canvas-confetti';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { AlertCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from './ui/form';
import { Input } from './ui/input';


const formSchema = z.object({
  fullName: z.string().min(3, 'O nome completo é obrigatório.'),
  phone: z.string().min(10, 'O celular é obrigatório.'),
  taxId: z.string().min(11, 'O CPF/CNPJ é obrigatório.'),
});
type CustomerDataFormValues = z.infer<typeof formSchema>;


interface PixPaymentModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  plan: { name: string; price: string; yearlyPrice: string; };
  isYearly: boolean;
  userProfile: UserProfile;
}

export default function PixPaymentModal({ isOpen, onOpenChange, plan, isYearly, userProfile }: PixPaymentModalProps) {
  const [step, setStep] = useState<'form' | 'qrcode'>('form');
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'PENDING' | 'PAID' | 'ERROR'>('PENDING');
  const [chargeId, setChargeId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [brCode, setBrCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const { toast } = useToast();
  const { onProfileUpdate } = useUser();


  const form = useForm<CustomerDataFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: userProfile.fullName || '',
      phone: userProfile.phone || '',
      taxId: userProfile.taxId || '',
    }
  });
  
  useEffect(() => {
    if(isOpen) {
        form.reset({
            fullName: userProfile.fullName || '',
            phone: userProfile.phone || '',
            taxId: userProfile.taxId || '',
        });
        setStep('form');
        setPaymentStatus('PENDING');
        setQrCode(null);
        setBrCode(null);
        setChargeId(null);
        setError(null);
        setIsLoading(false);
        setIsVerifying(false);
    }
  }, [isOpen, userProfile, form]);

  const generateQrCode = async (customerData: any) => {
    setIsLoading(true);
    setError(null);

    try {
        const response = await fetch('/api/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: userProfile.id,
                planName: plan.name,
                isYearly: isYearly,
                customerData: customerData,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Falha ao gerar o QR Code. Verifique os dados e tente novamente.');
        }
        
        setChargeId(data.id);
        setQrCode(data.brCodeBase64);
        setBrCode(data.brCode);
        setStep('qrcode');

    } catch (err: any) {
        setError(err.message);
        setPaymentStatus('ERROR');
        toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
        setIsLoading(false);
    }
  };

  const handleFormSubmit = async (data: CustomerDataFormValues) => {
    setIsLoading(true);
    try {
        const { fullName, phone, taxId } = data;
        if (fullName !== userProfile.fullName || phone !== userProfile.phone || taxId !== userProfile.taxId) {
            await onProfileUpdate({ fullName, phone, taxId });
        }
        const customerDataForApi = {
            name: fullName,
            email: userProfile.email,
            cellphone: phone,
            taxId: taxId,
        };

        await generateQrCode(customerDataForApi);
    } catch(e) {
        console.error("Failed to update profile before payment", e);
        toast({ title: "Erro ao salvar dados", description: "Não foi possível atualizar seu perfil. Tente novamente.", variant: "destructive"});
        setIsLoading(false);
    }
  }

  const handleSuccessfulPayment = useCallback((paidChargeId: string) => {
    if (paymentStatus === 'PAID') return;
    
    // Store charge ID for client-side finalization
    localStorage.setItem('pendingChargeId', paidChargeId);

    setPaymentStatus('PAID');
    confetti({
      particleCount: 150,
      spread: 80,
      origin: { y: 0.6 },
      zIndex: 9999,
    });
    
    setTimeout(() => {
        onOpenChange(false);
        toast({
            title: "Pagamento Confirmado!",
            description: "Sua assinatura será ativada em instantes. Agradecemos a confiança!",
            duration: 5000,
        })
    }, 3000);

  }, [onOpenChange, paymentStatus, toast]);
  
  const handleCheckPayment = useCallback(async () => {
    if (!chargeId || isVerifying || paymentStatus === 'PAID') return;

    setIsVerifying(true);
    try {
        const response = await fetch(`/api/checkout/${chargeId}`);
        const data = await response.json();

        if (response.ok && data.status === 'PAID') {
            handleSuccessfulPayment(data.chargeId);
        } else if (!response.ok) {
            toast({ title: 'Erro ao Verificar', description: data.error || 'Não foi possível verificar o pagamento no momento.', variant: 'destructive'});
        } else {
             toast({ title: 'Aguardando Pagamento', description: 'O pagamento ainda está pendente. A atualização será feita assim que o pagamento for processado.' });
        }
    } catch (e: any) {
        console.error("Verification failed", e);
        toast({ title: 'Erro de Conexão', description: 'Não foi possível conectar ao servidor para verificar.', variant: 'destructive'});
    } finally {
        setIsVerifying(false);
    }
  }, [chargeId, isVerifying, handleSuccessfulPayment, toast, paymentStatus]);


  const handleCopyCode = () => {
    if (!brCode) return;
    navigator.clipboard.writeText(brCode);
    toast({ title: 'Código Copiado!', description: 'Você pode usar o PIX Copia e Cola no seu banco.' });
  };

  const price = isYearly ? plan.yearlyPrice : plan.price;
  const period = isYearly ? 'por ano' : 'por mês';

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
                <div className='w-full'>
                    <DialogHeader className='text-left mb-6'>
                        <DialogTitle className="text-2xl font-bold flex items-center gap-2"><UserIcon className="h-6 w-6"/> Complete seus Dados</DialogTitle>
                        <DialogDescription>
                            Precisamos de algumas informações para gerar a cobrança.
                        </DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(handleFormSubmit)} id="customer-data-form" className="space-y-4">
                            <FormField control={form.control} name="fullName" render={({ field }) => (<FormItem><FormLabel>Nome Completo</FormLabel><FormControl><Input placeholder="Seu nome completo" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                            <FormField control={form.control} name="phone" render={({ field }) => (<FormItem><FormLabel>Celular</FormLabel><FormControl><Input placeholder="(XX) XXXXX-XXXX" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                            <FormField control={form.control} name="taxId" render={({ field }) => (<FormItem><FormLabel>CPF/CNPJ</FormLabel><FormControl><Input placeholder="000.000.000-00" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                        </form>
                    </Form>
                </div>
           );
       }

      if (isLoading) {
          return (
            <div className='flex flex-col items-center gap-4 text-muted-foreground animate-in fade-in'>
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p>Gerando seu QR Code...</p>
            </div>
          )
      }

      if (error) {
           return (
            <Alert variant="destructive" className='animate-in fade-in'>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Erro ao gerar QR Code</AlertTitle>
                <AlertDescription>
                    {error}
                </AlertDescription>
            </Alert>
          )
      }

      if (qrCode && brCode) {
          return (
             <div className='flex flex-col items-center gap-4 animate-in fade-in'>
              <img src={`data:image/png;base64,${qrCode}`} alt="PIX QR Code" width={200} height={200} />
              <Button onClick={handleCopyCode} variant="outline">
                <Copy className="mr-2 h-4 w-4" /> Copiar Código
              </Button>
            </div>
          )
      }

      return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md text-center">
        {step === 'qrcode' && (
             <DialogHeader>
                <DialogTitle className="text-2xl font-bold">Pagamento PIX</DialogTitle>
                <DialogDescription>
                    {paymentStatus !== 'PAID' && 'Escaneie o QR Code ou copie o código para pagar.'}
                </DialogDescription>
            </DialogHeader>
        )}

        <div className="py-8 flex items-center justify-center min-h-[300px]">
          {renderContent()}
        </div>
        
        {paymentStatus !== 'PAID' && (
            <>
                <div className="bg-muted p-4 rounded-lg">
                    <p className='font-semibold'>Plano {plan.name}</p>
                    <p className='text-2xl font-bold text-primary'>R$ {price}</p>
                    <p className='text-sm text-muted-foreground'>{period}</p>
                </div>

                {step === 'form' ? (
                     <DialogFooter>
                         <Button form="customer-data-form" type="submit" disabled={isLoading} className='w-full'>
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <ArrowRight className="mr-2 h-4 w-4" />}
                            Continuar para Pagamento
                        </Button>
                    </DialogFooter>
                ) : (
                    <DialogFooter className="flex-col gap-2">
                        <Button onClick={handleCheckPayment} disabled={isVerifying} className="w-full">
                            {isVerifying ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <RefreshCw className="mr-2 h-4 w-4" />}
                             Já Paguei, Verificar Status
                        </Button>
                         <div className="flex items-center justify-center gap-2 text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            <p className="text-sm">Aguarde. A atualização da assinatura será feita aqui.</p>
                        </div>
                    </DialogFooter>
                )}
            </>
        )}
      </DialogContent>
    </Dialog>
  );
}
