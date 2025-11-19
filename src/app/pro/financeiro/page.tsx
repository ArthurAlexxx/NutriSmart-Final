// src/app/pro/financeiro/page.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, orderBy, where, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { useUser, useFirestore, useCollection } from '@/firebase';
import type { FinancialTransaction } from '@/types/finance';

import AppLayout from '@/components/app-layout';
import TransactionModal from '@/components/pro/transaction-modal';
import FinanceChart from '@/components/pro/finance-chart';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { MonthPicker } from '@/components/ui/month-picker';
import { Loader2, PlusCircle, ArrowUpRight, ArrowDownLeft, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function FinanceiroPage() {
  const { user, userProfile, isUserLoading, onProfileUpdate } = useUser();
  const router = useRouter();
  const firestore = useFirestore();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isModalOpen, setModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<FinancialTransaction | null>(null);

  useEffect(() => {
    if (!isUserLoading && !user) router.push('/login');
    if (!isUserLoading && userProfile && userProfile.profileType !== 'professional') router.push('/dashboard');
  }, [user, userProfile, isUserLoading, router]);

  const transactionsQuery = useMemo(() => {
    if (!user || !firestore) return null;
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return query(
      collection(firestore, 'users', user.uid, 'transactions'),
      where('date', '>=', start),
      where('date', '<=', end),
      orderBy('date', 'desc')
    );
  }, [user, firestore, currentMonth]);

  const { data: transactions, isLoading: isLoadingTransactions } = useCollection<FinancialTransaction>(transactionsQuery);

  const { totalIncome, totalExpenses, netBalance } = useMemo(() => {
    if (!transactions) return { totalIncome: 0, totalExpenses: 0, netBalance: 0 };
    return transactions.reduce((acc, t) => {
      if (t.type === 'income') acc.totalIncome += t.amount;
      else acc.totalExpenses += t.amount;
      acc.netBalance = acc.totalIncome - acc.totalExpenses;
      return acc;
    }, { totalIncome: 0, totalExpenses: 0, netBalance: 0 });
  }, [transactions]);
  
  const handleEditTransaction = (transaction: FinancialTransaction) => {
    setSelectedTransaction(transaction);
    setModalOpen(true);
  };

  const handleAddNewTransaction = () => {
    setSelectedTransaction(null);
    setModalOpen(true);
  };

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
            <h1 className="text-3xl font-bold text-foreground font-heading">Painel Financeiro</h1>
            <p className="text-muted-foreground">Gerencie suas receitas, despesas e veja o desempenho do seu negócio.</p>
          </div>
          <Button onClick={handleAddNewTransaction}>
            <PlusCircle className="mr-2 h-4 w-4" /> Nova Transação
          </Button>
        </div>

        <Card>
          <CardContent className="p-4">
            <MonthPicker month={currentMonth} setMonth={setCurrentMonth} />
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Receita Total</CardTitle><TrendingUp className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold text-green-500">R$ {totalIncome.toFixed(2)}</div></CardContent></Card>
            <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Despesa Total</CardTitle><TrendingDown className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold text-red-500">R$ {totalExpenses.toFixed(2)}</div></CardContent></Card>
            <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Saldo Líquido</CardTitle><DollarSign className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className={cn("text-2xl font-bold", netBalance >= 0 ? "text-foreground" : "text-destructive")}>R$ {netBalance.toFixed(2)}</div></CardContent></Card>
        </div>

        {transactions && <FinanceChart transactions={transactions} />}

        <Card>
          <CardHeader>
            <CardTitle>Histórico de Transações</CardTitle>
            <CardDescription>Todas as movimentações do mês selecionado.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingTransactions ? (
                  <TableRow><TableCell colSpan={4} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow>
                ) : transactions && transactions.length > 0 ? (
                  transactions.map(t => (
                    <TableRow key={t.id} onClick={() => handleEditTransaction(t)} className="cursor-pointer">
                      <TableCell className="font-medium">{t.description}</TableCell>
                      <TableCell>{t.category}</TableCell>
                      <TableCell>{format(t.date.toDate(), 'dd/MM/yyyy')}</TableCell>
                      <TableCell className={cn("text-right font-semibold", t.type === 'income' ? 'text-green-600' : 'text-red-600')}>
                        {t.type === 'income' ? '+' : '-'} R$ {t.amount.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow><TableCell colSpan={4} className="h-24 text-center">Nenhuma transação encontrada para este mês.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      {user && (
        <TransactionModal
            isOpen={isModalOpen}
            onOpenChange={setModalOpen}
            userId={user.uid}
            transaction={selectedTransaction}
        />
      )}
    </AppLayout>
  );
}
