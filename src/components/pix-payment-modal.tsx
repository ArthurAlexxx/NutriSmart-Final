
// src/components/pix-payment-modal.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Loader2, Copy, Clock, CheckCircle, ArrowRight, User as UserIcon, RefreshCw } from 'lucide-react';
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
  const [lastPlanName, setLastPlanName] = useState<string | null>(null);
  
  const { toast } = useToast();
  const { onProfileUpdate, user } = useUser();


  const form = useForm<CustomerDataFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: userProfile.fullName || '',
      phone: userProfile.phone || '',
      taxId: userProfile.taxId || '',
    }
  });
  
  useEffect(() => {
    // Reset only if the modal is opened for a different plan
    if (isOpen && plan.name !== lastPlanName) {
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
        setLastPlanName(plan.name);
    } else if (isOpen && qrCode) {
        // If reopening for the same plan and a QR code exists, go straight to that step
        setStep('qrcode');
    }
  }, [isOpen, userProfile, form, plan.name, lastPlanName, qrCode]);


  const generateQrCode = async (customerData: any) => {
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
    } catch(e: any) {
        console.error("Failed to update profile before payment", e);
        toast({ title: "Erro ao salvar dados", description: e.message || "Não foi possível atualizar seu perfil. Tente novamente.", variant: "destructive"});
        setIsLoading(false);
    }
  }

  const handleSuccessfulPayment = useCallback((paidChargeId: string) => {
    if (paymentStatus === 'PAID' || !user) return;
    
    setPaymentStatus('PAID');
    // Store charge ID in localStorage, scoped to the user, for client-side finalization on the dashboard.
    localStorage.setItem(`pendingChargeId_${user.uid}`, paidChargeId);

    confetti({
      particleCount: 150,
      spread: 80,
      origin: { y: 0.6 },
      zIndex: 9999,
    });
    
    toast({
        title: "Pagamento Confirmado!",
        description: "Sua assinatura será ativada em instantes. Redirecionando...",
        duration: 4000,
    });
    
    setTimeout(() => {
        onOpenChange(false);
        // We no longer redirect from here. The dashboard will handle the final update.
    }, 3000);

  }, [onOpenChange, paymentStatus, toast, user]);
  
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
                <div className='w-full text-left'>
                    <DialogHeader className='mb-6'>
                        <DialogTitle className="text-2xl font-bold flex items-center gap-3"><UserIcon className="h-6 w-6 text-primary"/> Complete seus Dados</DialogTitle>
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
             <div className='flex flex-col items-center gap-4 animate-in fade-in w-full'>
                <div className='p-4 bg-white rounded-lg border'>
                    <img src={`data:image/png;base64,${qrCode}`} alt="PIX QR Code" width={200} height={200} />
                </div>
                <Button onClick={handleCopyCode} variant="outline" className='w-full'>
                    <Copy className="mr-2 h-4 w-4" /> Copiar Código PIX
                </Button>
            </div>
          )
      }

      return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md text-center p-0">
        <DialogHeader className='p-6 pb-2'>
            <DialogTitle className="text-2xl font-bold">Assinatura</DialogTitle>
             <DialogDescription>
                {step === 'form' 
                    ? `Você está assinando o plano ${plan.name}.`
                    : 'Finalize o pagamento para ativar seu plano.'
                }
            </DialogDescription>
        </DialogHeader>

        <div className="py-8 px-6 flex items-center justify-center min-h-[350px]">
          {renderContent()}
        </div>
        
        {paymentStatus !== 'PAID' && (
            <div className='border-t'>
                <div className="bg-muted p-4">
                    <div className='flex justify-between items-center'>
                         <p className='font-semibold'>Plano {plan.name}</p>
                         <p className='text-sm text-muted-foreground'>{period}</p>
                    </div>
                    <p className='text-2xl font-bold text-primary text-left'>R$ {price}</p>
                </div>

                {step === 'form' ? (
                     <DialogFooter className='p-6 pt-4'>
                         <Button form="customer-data-form" type="submit" disabled={isLoading} className='w-full'>
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <ArrowRight className="mr-2 h-4 w-4" />}
                            Gerar PIX para Pagamento
                        </Button>
                    </DialogFooter>
                ) : (
                    <DialogFooter className="flex-col gap-2 p-6 pt-4">
                        <Button onClick={handleCheckPayment} disabled={isVerifying} className="w-full">
                            {isVerifying ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <RefreshCw className="mr-2 h-4 w-4" />}
                             Já Paguei, Verificar Status
                        </Button>
                    </DialogFooter>
                )}
            </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
