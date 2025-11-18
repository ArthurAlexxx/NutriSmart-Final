// src/app/checkout/page.tsx
'use client';

import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function CheckoutPage() {
    // A funcionalidade de checkout foi desativada temporariamente.
    return (
        <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background text-center p-6">
            <Loader2 className="h-16 w-16 animate-spin text-muted-foreground mb-8" />
            <h1 className="text-3xl font-bold font-heading mb-2">Página em Manutenção</h1>
            <p className="text-muted-foreground max-w-sm mb-8">
                A funcionalidade de checkout e pagamentos está temporariamente desativada.
            </p>
            <Button asChild>
                <Link href="/dashboard">Voltar para o Dashboard</Link>
            </Button>
        </div>
    );
}
