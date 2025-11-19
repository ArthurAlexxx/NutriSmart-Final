// src/components/pix-payment-modal.tsx
'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Loader2, Copy, CheckCircle, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { type UserProfile } from '@/types/user';
import Image from 'next/image';
import { Button } from './ui/button';
import { onSnapshot, doc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { useRouter } from 'next/navigation';

interface PixPaymentModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  plan: { name: string; price: string; yearlyPrice: string; };
  isYearly: boolean;
  userProfile: UserProfile;
}

export default function PixPaymentModal({ isOpen, onOpenChange, plan, isYearly, userProfile }: PixPaymentModalProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [brCode, setBrCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const firestore = useFirestore();
  const router = useRouter();

  useEffect(() => {
    if (isOpen) {
      const generateQrCode = async () => {
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
            }),
          });
          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.error || 'Falha ao gerar o QR Code.');
          }
          setQrCode(data.brCodeBase64);
          setBrCode(data.brCode);
        } catch (err: any) {
          setError(err.message);
          toast({ title: 'Erro', description: err.message, variant: 'destructive' });
        } finally {
          setIsLoading(false);
        }
      };
      generateQrCode();
    }
  }, [isOpen, plan, isYearly, userProfile.id, toast]);

  useEffect(() => {
    if (!isOpen || !firestore || !userProfile) return;

    // Listen for subscription status changes
    const unsub = onSnapshot(doc(firestore, 'users', userProfile.id), (doc) => {
      const data = doc.data() as UserProfile;
      if (data && data.subscriptionStatus === 'premium') {
        onOpenChange(false); // Close modal
        router.push('/checkout?status=success'); // Redirect to success page
      }
    });

    return () => unsub();
  }, [isOpen, firestore, userProfile, onOpenChange, router]);

  const handleCopyCode = () => {
    if (!brCode) return;
    navigator.clipboard.writeText(brCode);
    toast({ title: 'Código Copiado!', description: 'Você pode usar o PIX Copia e Cola no seu banco.' });
  };

  const price = isYearly ? plan.yearlyPrice : plan.price;
  const period = isYearly ? 'por ano' : 'por mês';

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md text-center">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Pagamento PIX</DialogTitle>
          <DialogDescription>
            Escaneie o QR Code ou copie o código para pagar.
          </DialogDescription>
        </DialogHeader>

        <div className="py-8 flex items-center justify-center min-h-[250px]">
          {isLoading ? (
            <div className='flex flex-col items-center gap-4 text-muted-foreground'>
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p>Gerando seu QR Code...</p>
            </div>
          ) : error ? (
            <div className='text-destructive-foreground bg-destructive/80 p-4 rounded-lg'>
                <p className='font-bold'>Erro ao gerar QR Code</p>
                <p className='text-sm'>{error}</p>
            </div>
          ) : qrCode && brCode ? (
            <div className='flex flex-col items-center gap-4'>
              <Image src={qrCode} alt="PIX QR Code" width={200} height={200} />
              <Button onClick={handleCopyCode} variant="outline">
                <Copy className="mr-2 h-4 w-4" /> Copiar Código
              </Button>
            </div>
          ) : null}
        </div>
        
        <div className="bg-muted p-4 rounded-lg">
            <p className='font-semibold'>Plano {plan.name}</p>
            <p className='text-2xl font-bold text-primary'>R$ {price}</p>
            <p className='text-sm text-muted-foreground'>{period}</p>
        </div>

        <div className="flex items-center justify-center gap-2 text-muted-foreground mt-4">
            <Clock className="h-4 w-4" />
            <p className="text-sm">Aguardando pagamento...</p>
        </div>

      </DialogContent>
    </Dialog>
  );
}
