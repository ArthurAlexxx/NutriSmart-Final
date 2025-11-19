// src/app/checkout/page.tsx
'use client';

import { CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function CheckoutSuccessPage() {
    return (
        <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background text-center p-6">
            <CheckCircle className="h-16 w-16 text-green-500 mb-8" />
            <h1 className="text-3xl font-bold font-heading mb-2">Assinatura Ativada!</h1>
            <p className="text-muted-foreground max-w-sm mb-8">
                Sua assinatura foi processada com sucesso. Você agora tem acesso a todos os recursos do seu plano.
            </p>
            <Button asChild>
                <Link href="/dashboard">Ir para o Dashboard</Link>
            </Button>
        </div>
    );
}
