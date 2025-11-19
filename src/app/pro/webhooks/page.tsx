
// src/app/pro/webhooks/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import AppLayout from '@/components/app-layout';
import { Loader2, Shield, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Timestamp } from 'firebase/firestore';

interface WebhookLog {
    id: string;
    payload: any;
    status: 'PROCESSING' | 'SUCCESS' | 'ERROR' | 'IGNORED';
    receivedAt: Timestamp;
    errorDetails?: string;
    details?: string;
}

function WebhookLogItem({ log }: { log: WebhookLog }) {
    const statusConfig = {
        SUCCESS: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/10', label: 'Sucesso' },
        ERROR: { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-500/10', label: 'Erro' },
        PROCESSING: { icon: Clock, color: 'text-yellow-500', bg: 'bg-yellow-500/10', label: 'Processando' },
        IGNORED: { icon: Shield, color: 'text-gray-500', bg: 'bg-gray-500/10', label: 'Ignorado' },
    };

    const { icon: Icon, color, bg, label } = statusConfig[log.status];

    return (
        <Card className={cn("overflow-hidden", log.status === 'ERROR' && 'border-red-500/50')}>
            <Accordion type="single" collapsible>
                <AccordionItem value="item-1" className="border-b-0">
                    <AccordionTrigger className="p-4 hover:no-underline">
                        <div className="flex items-center gap-4 flex-1">
                             <div className={cn("p-2 rounded-full", bg)}>
                                <Icon className={cn("h-5 w-5", color)} />
                            </div>
                            <div className='text-left'>
                                <p className="font-semibold">
                                    Evento: <span className="text-primary">{log.payload?.event || 'N/A'}</span>
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    {format(log.receivedAt.toDate(), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                                </p>
                            </div>
                            <Badge variant="outline" className={cn("ml-auto", bg, color)}>{label}</Badge>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="p-4 pt-0">
                        <pre className="bg-muted p-4 rounded-lg text-xs overflow-auto max-h-96">
                            {JSON.stringify(log, null, 2)}
                        </pre>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </Card>
    );
}

export default function WebhooksPage() {
    const { user, userProfile, isUserLoading, onProfileUpdate } = useUser();
    const router = useRouter();
    const firestore = useFirestore();

    useEffect(() => {
        if (!isUserLoading && !user) router.push('/login');
        if (!isUserLoading && userProfile && userProfile.profileType !== 'professional') router.push('/dashboard');
    }, [user, userProfile, isUserLoading, router]);

    const webhooksQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'webhook_logs'), orderBy('receivedAt', 'desc'));
    }, [firestore]);

    const { data: webhooks, isLoading } = useCollection<WebhookLog>(webhooksQuery);

    if (isUserLoading || !userProfile) {
        return (
            <AppLayout user={user} userProfile={userProfile} onProfileUpdate={onProfileUpdate}>
                <div className="flex h-full w-full items-center justify-center">
                    <Loader2 className="h-16 w-16 animate-spin text-primary" />
                </div>
            </AppLayout>
        );
    }
    
    return (
        <AppLayout user={user} userProfile={userProfile} onProfileUpdate={onProfileUpdate}>
            <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
                <div className="text-center sm:text-left">
                    <h1 className="text-3xl font-bold text-foreground font-heading">Monitor de Webhooks</h1>
                    <p className="text-muted-foreground">Visualize os eventos recebidos do AbacatePay em tempo real.</p>
                </div>

                <div className="space-y-4">
                    {isLoading ? (
                        <div className="flex h-64 items-center justify-center">
                            <Loader2 className="h-12 w-12 animate-spin text-primary" />
                        </div>
                    ) : webhooks && webhooks.length > 0 ? (
                        webhooks.map(log => <WebhookLogItem key={log.id} log={log} />)
                    ) : (
                        <Card className="flex flex-col items-center justify-center h-64 text-center p-8 border-dashed">
                             <Shield className="h-12 w-12 text-muted-foreground mb-4" />
                            <CardTitle>Nenhum webhook recebido</CardTitle>
                            <CardDescription className="mt-2">Aguardando notificações do gateway de pagamento. Realize um pagamento de teste para ver os logs aqui.</CardDescription>
                        </Card>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}

