// src/app/admin/users/page.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, where, getCountFromServer } from 'firebase/firestore';
import AppLayout from '@/components/app-layout';
import { Loader2, Shield, UserCheck, Crown, User, Search, Users, DollarSign, Edit, Eye, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { UserProfile } from '@/types/user';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';


type SubscriptionFilter = 'all' | 'free' | 'premium' | 'professional';

function AdminUsersPage() {
  const { user, userProfile, isAdmin, isUserLoading, onProfileUpdate } = useUser();
  const router = useRouter();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<SubscriptionFilter>('all');
  const [counts, setCounts] = useState({ all: 0, free: 0, premium: 0, professional: 0 });
  
  useEffect(() => {
    if (!isUserLoading && !isAdmin) {
      router.push('/dashboard');
    }
  }, [isUserLoading, isAdmin, router]);

  useEffect(() => {
    if (!firestore) return;
    const fetchCounts = async () => {
        try {
            const usersRef = collection(firestore, 'users');
            const allSnap = await getCountFromServer(usersRef);
            const freeSnap = await getCountFromServer(query(usersRef, where('subscriptionStatus', '==', 'free')));
            const premiumSnap = await getCountFromServer(query(usersRef, where('subscriptionStatus', '==', 'premium')));
            const proSnap = await getCountFromServer(query(usersRef, where('subscriptionStatus', '==', 'professional')));

            setCounts({
                all: allSnap.data().count,
                free: freeSnap.data().count,
                premium: premiumSnap.data().count,
                professional: proSnap.data().count,
            });

        } catch (e) {
            console.error("Failed to fetch user counts:", e);
        }
    };
    fetchCounts();
  }, [firestore]);


  const usersQuery = useMemoFirebase(() => {
    if (!isAdmin || !firestore) return null;

    const baseCollection = collection(firestore, 'users');
    
    if (filter === 'all') {
        return query(baseCollection, orderBy('createdAt', 'desc'));
    }

    // This query requires a composite index on (subscriptionStatus, createdAt)
    return query(baseCollection, where('subscriptionStatus', '==', filter), orderBy('createdAt', 'desc'));

  }, [isAdmin, firestore, filter]);

  const { data: users, isLoading: isLoadingUsers } = useCollection<UserProfile>(usersQuery);

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    
    if (!searchTerm) return users;

    return users.filter(u =>
      u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

  }, [users, searchTerm]);

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
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left mb-8">
            <div>
                <h1 className="text-3xl font-bold font-heading flex items-center gap-3 justify-center sm:justify-start">
                    <Users className='h-8 w-8 text-primary' />
                    Gerenciamento de Usuários
                </h1>
                <p className="text-muted-foreground">Visualize e gerencie os usuários do sistema.</p>
            </div>
             <div className="relative w-full sm:max-w-sm">
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
                        <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoadingUsers ? (
                         <TableRow><TableCell colSpan={5} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow>
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
                                <TableCell className="text-right space-x-2">
                                    <Button asChild variant="outline" size="sm">
                                        <Link href={`/admin/users/${u.id}`}>
                                            <Eye className="h-3 w-3 mr-2" /> Gerenciar
                                        </Link>
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))
                    ) : (
                        <TableRow><TableCell colSpan={5} className="h-24 text-center">Nenhum usuário encontrado.</TableCell></TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
      </div>
    </AppLayout>
  );
}

export default AdminUsersPage;
