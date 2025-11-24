
// src/app/admin/logs/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import AppLayout from '@/components/app-layout';
import { Loader2, Webhook, CheckCircle, XCircle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { WebhookLog } from '@/types/webhook';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { ScrollArea } from '@/components/ui/scroll-area';

function AdminLogsPage() {
  const { user, userProfile, isAdmin, isUserLoading, onProfileUpdate } = useUser();
  const router = useRouter();
  const firestore = useFirestore();

  const logsQuery = useMemoFirebase(() => {
    if (!isAdmin || !firestore) return null;
    return query(collection(firestore, 'webhook_logs'), orderBy('createdAt', 'desc'));
  }, [isAdmin, firestore]);

  const { data: logs, isLoading: isLoadingLogs } = useCollection<WebhookLog>(logsQuery);

  useEffect(() => {
    if (!isUserLoading && !isAdmin) {
      router.push('/dashboard');
    }
  }, [isUserLoading, isAdmin, router]);

  if (isUserLoading || !isAdmin) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <AppLayout user={user} userProfile={userProfile} onProfileUpdate={onProfileUpdate}>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="flex items-center justify-between mb-8">
            <div>
                <h1 className="text-3xl font-bold font-heading flex items-center gap-3">
                    <Webhook className='h-8 w-8 text-primary' />
                    Logs de Webhooks
                </h1>
                <p className="text-muted-foreground">Auditoria de eventos recebidos pelo gateway de pagamento.</p>
            </div>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Eventos</CardTitle>
            <CardDescription>Logs de todos os webhooks recebidos pela plataforma.</CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <Table>
                  <TableHeader>
                      <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Detalhes</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                      {isLoadingLogs ? (
                          <TableRow><TableCell colSpan={4} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow>
                      ) : logs && logs.length > 0 ? (
                          logs.map(log => (
                            <AccordionItem value={log.id} key={log.id} asChild>
                              <>
                                <TableRow>
                                  <TableCell>{log.createdAt ? format(log.createdAt.toDate(), 'dd/MM/yyyy HH:mm:ss', {locale: ptBR}) : 'N/A'}</TableCell>
                                  <TableCell>
                                      <Badge variant={log.status === 'SUCCESS' ? 'default' : 'destructive'} className={log.status === 'SUCCESS' ? 'bg-green-500' : ''}>
                                          {log.status === 'SUCCESS' ? <CheckCircle className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                                          {log.status}
                                      </Badge>
                                  </TableCell>
                                  <TableCell className="max-w-sm truncate">{log.details}</TableCell>
                                  <TableCell>
                                      <AccordionTrigger className='p-2 hover:no-underline'>
                                          <span className='sr-only'>Ver payload</span>
                                      </AccordionTrigger>
                                  </TableCell>
                                </TableRow>
                                <AccordionContent asChild>
                                    <tr className='bg-muted/50 hover:bg-muted/50'>
                                        <TableCell colSpan={4} className='p-0'>
                                            <div className='p-4'>
                                                <h4 className='font-semibold mb-2'>Payload do Webhook:</h4>
                                                <ScrollArea className='h-48 w-full rounded-md border bg-background p-3'>
                                                    <pre className='text-xs'>{JSON.stringify(log.payload, null, 2)}</pre>
                                                </ScrollArea>
                                            </div>
                                        </TableCell>
                                    </tr>
                                </AccordionContent>
                              </>
                            </AccordionItem>
                          ))
                      ) : (
                          <TableRow><TableCell colSpan={4} className="h-24 text-center">Nenhum log encontrado.</TableCell></TableRow>
                      )}
                  </TableBody>
              </Table>
            </Accordion>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

export default AdminLogsPage;
