// src/app/checkout/page.tsx
'use client';

import { CheckCircle, Home } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';
import confetti from 'canvas-confetti';

function CheckoutContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const status = searchParams.get('status');

    useEffect(() => {
        if (status === 'success') {
            confetti({
                particleCount: 150,
                spread: 80,
                origin: { y: 0.6 },
                zIndex: 1000,
            });
            // Redirect after a short delay to allow user to see the message
            setTimeout(() => {
                router.push('/dashboard');
            }, 3000);
        } else {
             router.push('/pricing');
        }
    }, [status, router]);

    if (status !== 'success') {
        return null; // or a loading/error state
    }

    return (
        <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background text-center p-6 animate-fade-in">
            <CheckCircle className="h-20 w-20 text-green-500 mb-8 animate-in zoom-in-50" />
            <h1 className="text-4xl font-bold font-heading mb-3">Pagamento Aprovado!</h1>
            <p className="text-lg text-muted-foreground max-w-md mb-8">
                Sua assinatura foi ativada. Você será redirecionado para o seu painel em alguns segundos.
            </p>
            <Button asChild>
                <Link href="/dashboard">
                    <Home className="mr-2 h-4 w-4" /> Ir para o Dashboard
                </Link>
            </Button>
        </div>
    );
}

export default function CheckoutSuccessPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center">Carregando...</div>}>
            <CheckoutContent />
        </Suspense>
    );
}
