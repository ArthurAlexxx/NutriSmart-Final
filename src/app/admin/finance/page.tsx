// src/app/admin/finance/page.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, orderBy, where, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { useUser, useFirestore } from '@/firebase';
import type { WebhookLog } from '@/types/webhook';

import AppLayout from '@/components/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { MonthPicker } from '@/components/ui/month-picker';
import { Loader2, TrendingUp, Users, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/page-header';

interface PaymentData {
    id: string;
    userId: string;
    amount: number;
    plan: string;
    billingCycle: string;
    paymentDate: Date;
}

export default function AdminFinancePage() {
  const { user, userProfile, isUserLoading, onProfileUpdate, isAdmin } = useUser();
  const router = useRouter();
  const firestore = useFirestore();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [isLoadingPayments, setIsLoadingPayments] = useState(true);

  useEffect(() => {
    if (!isUserLoading && !isAdmin) {
      router.push('/dashboard');
    }
  }, [isAdmin, isUserLoading, router]);

  useEffect(() => {
    if (!isAdmin || !firestore) {
        setIsLoadingPayments(false);
        return;
    }

    setIsLoadingPayments(true);
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);

    const q = query(
      collection(firestore, 'webhook_logs'),
      where('status', '==', 'SUCCESS'),
      where('createdAt', '>=', start),
      where('createdAt', '<=', end),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const successfulPayments: PaymentData[] = [];
        snapshot.forEach(doc => {
            const log = doc.data() as WebhookLog;
            const paymentData = log.payload?.payment;
            
            if (paymentData) {
                const metadata = paymentData.metadata;
                successfulPayments.push({
                    id: doc.id,
                    userId: metadata?.userId || paymentData.externalReference || 'N/A',
                    amount: paymentData.value,
                    plan: metadata?.plan || 'N/A',
                    billingCycle: metadata?.billingCycle || 'N/A',
                    paymentDate: log.createdAt.toDate(),
                });
            }
        });
        setPayments(successfulPayments);
        setIsLoadingPayments(false);
    }, (error) => {
        console.error("Error fetching payment logs:", error);
        setIsLoadingPayments(false);
    });
    
    return () => unsubscribe();
  }, [isAdmin, firestore, currentMonth]);


  const { totalRevenue, totalSubscribers } = useMemo(() => {
    if (!payments) return { totalRevenue: 0, totalSubscribers: 0 };
    
    const uniqueUsers = new Set(payments.map(p => p.userId));

    return {
      totalRevenue: payments.reduce((acc, p) => acc + p.amount, 0),
      totalSubscribers: uniqueUsers.size,
    };
  }, [payments]);
  
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
      <div className="p-4 sm:p-6 lg:p-8 space-y-8">
        <PageHeader 
          icon={DollarSign}
          title="Painel Financeiro"
          description="Receita e transações de assinaturas da plataforma."
        />

        <Card>
          <CardContent className="p-4">
            <MonthPicker month={currentMonth} setMonth={setCurrentMonth} />
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Receita do Mês</CardTitle><DollarSign className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold text-green-500">R$ {totalRevenue.toFixed(2)}</div></CardContent></Card>
            <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Assinantes Pagos no Mês</CardTitle><Users className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{totalSubscribers}</div></CardContent></Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Histórico de Pagamentos</CardTitle>
            <CardDescription>Pagamentos de assinatura bem-sucedidos no mês selecionado.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID do Usuário</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingPayments ? (
                  <TableRow><TableCell colSpan={4} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow>
                ) : payments && payments.length > 0 ? (
                  payments.map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium truncate max-w-xs">{p.userId}</TableCell>
                      <TableCell>
                        <Badge variant={p.plan === 'PROFISSIONAL' ? 'default' : 'secondary'} className={cn(p.plan === 'PROFISSIONAL' && 'bg-blue-500')}>{p.plan}</Badge>
                      </TableCell>
                      <TableCell>{format(p.paymentDate, 'dd/MM/yyyy HH:mm')}</TableCell>
                      <TableCell className="text-right font-semibold text-green-600">
                        R$ {p.amount.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow><TableCell colSpan={4} className="h-24 text-center">Nenhum pagamento encontrado para este mês.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
