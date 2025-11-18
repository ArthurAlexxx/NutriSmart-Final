// src/components/subscription-overlay.tsx
'use client';

import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Sparkles, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function SubscriptionOverlay() {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in p-4">
      <Card className="w-full max-w-md text-center shadow-2xl animate-fade-in-down">
        <CardContent className="p-8">
            <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="h-8 w-8" />
            </div>
          <h2 className="text-2xl font-bold font-heading">Acesse o Poder da IA</h2>
          <p className="text-muted-foreground mt-2">
            Desbloqueie análises detalhadas, planos alimentares inteligentes e o Chef Virtual com uma assinatura Premium.
          </p>
          <Button asChild size="lg" className="mt-6 w-full">
            <Link href="/pricing">
                Ver Planos Premium <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
