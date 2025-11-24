
// src/app/admin/page.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import AppLayout from '@/components/app-layout';
import { Loader2, Shield, UserCheck, Crown, User, Search, Users, DollarSign } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { UserProfile } from '@/types/user';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type SubscriptionFilter = 'all' | 'free' | 'premium' | 'professional';

function AdminPage() {
  const { user, userProfile, isAdmin, isUserLoading, onProfileUpdate } = useUser();
  const router = useRouter();
  const firestore = useFirestore();

  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<SubscriptionFilter>('all');

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

  const { filteredUsers, counts } = useMemo(() => {
    if (!users) return { filteredUsers: [], counts: { all: 0, free: 0, premium: 0, professional: 0 } };
    
    const calculatedCounts = users.reduce((acc, u) => {
        const status = u.subscriptionStatus || 'free';
        acc.all++;
        acc[status]++;
        return acc;
    }, { all: 0, free: 0, premium: 0, professional: 0 });

    const searchFiltered = users.filter(u =>
      u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const finalFiltered = filter === 'all' 
        ? searchFiltered 
        : searchFiltered.filter(u => (u.subscriptionStatus || 'free') === filter);

    return { filteredUsers: finalFiltered, counts: calculatedCounts };
  }, [users, searchTerm, filter]);

  if (isUserLoading || !isAdmin) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }
  
  const getSubscriptionBadge = (user: UserProfile) => {
      const status = user.subscriptionStatus || 'free';
      switch(status) {
          case 'premium': return <Badge variant="default" className="bg-purple-500">Premium</Badge>;
          case 'professional': return <Badge variant="default" className="bg-blue-500">Profissional</Badge>;
          case 'free':
          default:
              return <Badge variant="secondary">Gratuito</Badge>
      }
  }
  
  const getRoleBadge = (user: UserProfile) => {
    const role = user.role || 'patient';
    switch(role) {
      case 'admin': return <Badge variant="destructive"><Shield className="h-3 w-3 mr-1"/> Admin</Badge>;
      case 'professional': return <Badge variant="default" className="bg-blue-500"><UserCheck className="h-3 w-3 mr-1"/> Pro</Badge>;
      case 'patient':
      default:
        return <Badge variant="outline"><User className="h-3 w-3 mr-1"/> Paciente</Badge>;
    }
  }

  const summaryCards = [
    { title: 'Todos', count: counts.all, filter: 'all', Icon: Users },
    { title: 'Gratuitos', count: counts.free, filter: 'free', Icon: User },
    { title: 'Premium', count: counts.premium, filter: 'premium', Icon: Crown },
    { title: 'Profissionais', count: counts.professional, filter: 'professional', Icon: DollarSign },
  ];

  return (
    <AppLayout user={user} userProfile={userProfile} onProfileUpdate={onProfileUpdate}>
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-between mb-8">
            <div>
                <h1 className="text-3xl font-bold font-heading">Painel Administrativo</h1>
                <p className="text-muted-foreground">Gerenciamento de usuários do sistema.</p>
            </div>
             <div className="relative max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Buscar por nome ou email..."
                    className="w-full rounded-lg bg-background pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4 mb-8">
          {summaryCards.map(card => (
            <Card key={card.title} className={cn("cursor-pointer hover:bg-accent transition-colors", filter === card.filter && "ring-2 ring-primary")} onClick={() => setFilter(card.filter as SubscriptionFilter)}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                <card.Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.count}</div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="border rounded-lg overflow-hidden">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Usuário</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Plano</TableHead>
                        <TableHead>Data de Cadastro</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoadingUsers ? (
                         <TableRow><TableCell colSpan={4} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow>
                    ) : filteredUsers.length > 0 ? (
                        filteredUsers.map(u => (
                            <TableRow key={u.id}>
                                <TableCell>
                                    <div className="font-medium">{u.fullName}</div>
                                    <div className="text-sm text-muted-foreground">{u.email}</div>
                                </TableCell>
                                <TableCell>{getRoleBadge(u)}</TableCell>
                                <TableCell>{getSubscriptionBadge(u)}</TableCell>
                                <TableCell>{u.createdAt ? format(u.createdAt.toDate(), 'dd/MM/yyyy', {locale: ptBR}) : 'N/A'}</TableCell>
                            </TableRow>
                        ))
                    ) : (
                        <TableRow><TableCell colSpan={4} className="h-24 text-center">Nenhum usuário encontrado.</TableCell></TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
      </div>
    </AppLayout>
  );
}

export default AdminPage;
