// src/app/admin/page.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, where, getCountFromServer, Timestamp } from 'firebase/firestore';
import { subDays } from 'date-fns';
import AppLayout from '@/components/app-layout';
import { Loader2, Users, UserPlus, DollarSign, Crown } from 'lucide-react';
import type { UserProfile } from '@/types/user';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardCharts } from '@/components/dashboard-charts';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

function AdminDashboardPage() {
  const { user, userProfile, isAdmin, isUserLoading, onProfileUpdate } = useUser();
  const router = useRouter();
  const firestore = useFirestore();

  const [stats, setStats] = useState({
    totalUsers: 0,
    newUsers: 0,
    totalRevenue: 0,
    activeSubscribers: 0,
  });

  const usersQuery = useMemoFirebase(() => {
    if (!isAdmin || !firestore) return null;
    return query(collection(firestore, 'users'), orderBy('createdAt', 'desc'));
  }, [isAdmin, firestore]);

  const { data: users, isLoading: isLoadingUsers } = useCollection<UserProfile>(usersQuery);

  useEffect(() => {
    if (!isUserLoading && !isAdmin) {
      router.push('/dashboard');
    }
  }, [isUserLoading, isAdmin, router]);

  useEffect(() => {
    const fetchStats = async () => {
        if (!firestore || !isAdmin) return;

        try {
            const usersRef = collection(firestore, 'users');
            const thirtyDaysAgo = Timestamp.fromDate(subDays(new Date(), 30));

            const totalUsersSnap = await getCountFromServer(usersRef);
            const newUsersQuery = query(usersRef, where('createdAt', '>=', thirtyDaysAgo));
            const newUsersSnap = await getCountFromServer(newUsersQuery);
            
            const subscribersQuery = query(usersRef, where('subscriptionStatus', 'in', ['premium', 'professional']));
            const activeSubscribersSnap = await getCountFromServer(subscribersQuery);
            
            // Revenue is harder to calculate on the fly, will be done in finance page
            setStats(prev => ({
                ...prev,
                totalUsers: totalUsersSnap.data().count,
                newUsers: newUsersSnap.data().count,
                activeSubscribers: activeSubscribersSnap.data().count,
            }));
        } catch(e) {
            console.error("Failed to fetch admin stats:", e);
        }
    };
    fetchStats();
  }, [firestore, isAdmin]);


  const planDistribution = useMemo(() => {
    if (!users) return [];
    const counts = users.reduce((acc, user) => {
        const status = user.subscriptionStatus || 'free';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    return [
      { name: 'Gratuito', value: counts.free || 0, fill: 'hsl(var(--chart-2))' },
      { name: 'Premium', value: counts.premium || 0, fill: 'hsl(var(--chart-1))' },
      { name: 'Profissional', value: counts.professional || 0, fill: 'hsl(var(--chart-4))' },
    ];
  }, [users]);
  
   const userGrowthData = useMemo(() => {
    if (!users) return [];
    const sortedUsers = [...users].sort((a, b) => a.createdAt.toDate().getTime() - b.createdAt.toDate().getTime());
    let cumulative = 0;
    const dataMap = new Map<string, number>();

    for (const user of sortedUsers) {
      const dateStr = user.createdAt.toDate().toISOString().split('T')[0];
      cumulative++;
      dataMap.set(dateStr, cumulative);
    }
    
    if (dataMap.size === 0) return [];

    const firstDate = new Date(sortedUsers[0].createdAt.toDate());
    const today = new Date();
    const result = [];
    let lastValue = 0;

    for (let d = firstDate; d <= today; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        if (dataMap.has(dateStr)) {
            lastValue = dataMap.get(dateStr)!;
        }
        result.push({ day: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit'}), users: lastValue });
    }
    
    return result;
  }, [users]);


  if (isUserLoading || !isAdmin) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  const summaryCards = [
    { title: 'Total de Usuários', value: stats.totalUsers.toLocaleString('pt-BR'), Icon: Users, href: '/admin/users' },
    { title: 'Novos Usuários (30d)', value: stats.newUsers.toLocaleString('pt-BR'), Icon: UserPlus, href: '#' },
    { title: 'Assinantes Ativos', value: stats.activeSubscribers.toLocaleString('pt-BR'), Icon: Crown, href: '#' },
    { title: 'Ver Receita', value: 'Painel', Icon: DollarSign, isLink: true, href: '/admin/finance' },
  ];

  return (
    <AppLayout user={user} userProfile={userProfile} onProfileUpdate={onProfileUpdate}>
      <div className="container mx-auto py-8 space-y-8">
        <div>
            <h1 className="text-3xl font-bold font-heading">Dashboard do Administrador</h1>
            <p className="text-muted-foreground">Visão geral do crescimento e métricas da plataforma.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
          {summaryCards.map(card => (
            <Card key={card.title} className="hover:bg-accent/50 transition-colors">
              <Link href={card.href || '#'}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                  <card.Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{card.value}</div>
                </CardContent>
              </Link>
            </Card>
          ))}
        </div>
        
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-5">
            <Card className="lg:col-span-3">
                <CardHeader>
                    <CardTitle>Crescimento de Usuários</CardTitle>
                </CardHeader>
                <CardContent className="pl-2">
                    <DashboardCharts chartType="user-growth" data={userGrowthData} />
                </CardContent>
            </Card>
            <Card className="lg:col-span-2">
                <CardHeader>
                    <CardTitle>Distribuição de Planos</CardTitle>
                </CardHeader>
                <CardContent>
                    <DashboardCharts chartType="plan-distribution" data={planDistribution} />
                </CardContent>
            </Card>
        </div>
      </div>
    </AppLayout>
  );
}

export default AdminDashboardPage;
