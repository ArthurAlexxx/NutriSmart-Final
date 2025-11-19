// src/app/pro/webhooks/page.tsx
'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, orderBy } from 'firebase/firestore';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import type { WebhookLog } from '@/types/webhook';

import AppLayout from '@/components/app-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Webhook, CheckCircle, XCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

function WebhookLogRow({ log }: { log: WebhookLog }) {
    const isSuccess = log.status === 'SUCCESS';
    const logDate = log.createdAt.toDate();

    return (
        <Accordion type="single" collapsible>
            <AccordionItem value={log.id}>
                <TableRow>
                    <TableCell>
                         <AccordionTrigger className="p-0 hover:no-underline font-medium">
                            <div className="flex items-center gap-2">
                                {isSuccess ? <CheckCircle className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-red-500" />}
                                <span className='truncate'>{log.payload.event || 'Evento Desconhecido'}</span>
                             </div>
                         </AccordionTrigger>
                    </TableCell>
                    <TableCell>
                        <Badge variant={isSuccess ? 'default' : 'destructive'}>{log.status}</Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{format(logDate, "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}</TableCell>
                    <TableCell className="hidden lg:table-cell truncate max-w-xs">{log.details}</TableCell>
                </TableRow>
                <AccordionContent>
                    <div className='p-4 bg-muted/50 rounded-b-lg'>
                        <h4 className='font-semibold mb-2'>Payload Recebido:</h4>
                        <pre className='text-xs bg-background p-3 rounded-md overflow-x-auto'>
                            {JSON.stringify(log.payload, null, 2)}
                        </pre>
                    </div>
                </AccordionContent>
            </AccordionItem>
        </Accordion>
    );
}

export default function WebhooksPage() {
  const { user, userProfile, isUserLoading, onProfileUpdate } = useUser();
  const router = useRouter();
  const firestore = useFirestore();

  const webhooksQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'webhook_logs'), orderBy('createdAt', 'desc'));
  }, [firestore]);

  const { data: webhookLogs, isLoading: isLoadingWebhooks } = useCollection<WebhookLog>(webhooksQuery);
  
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
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-center sm:text-left">
          <div>
            <h1 className="text-3xl font-bold text-foreground font-heading flex items-center gap-3">
                <Webhook className="h-8 w-8" />
                Monitor de Webhooks
            </h1>
            <p className="text-muted-foreground">Visualize as notificações recebidas do AbacatePay em tempo real.</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Histórico de Eventos</CardTitle>
            <CardDescription>Eventos mais recentes recebidos do gateway de pagamento.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Evento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Data</TableHead>
                  <TableHead className="hidden lg:table-cell">Detalhes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingWebhooks ? (
                  <TableRow><TableCell colSpan={4} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow>
                ) : webhookLogs && webhookLogs.length > 0 ? (
                  webhookLogs.map(log => (
                    <WebhookLogRow key={log.id} log={log} />
                  ))
                ) : (
                  <TableRow><TableCell colSpan={4} className="h-24 text-center">Nenhum evento de webhook recebido ainda.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
