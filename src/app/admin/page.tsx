// src/app/admin/page.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import AppLayout from '@/components/app-layout';
import { Loader2, Shield, UserCheck, Crown, User, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { UserProfile } from '@/types/user';

function AdminPage() {
  const { user, userProfile, isAdmin, isUserLoading, onProfileUpdate } = useUser();
  const router = useRouter();
  const firestore = useFirestore();

  const [searchTerm, setSearchTerm] = useState('');

  const usersQuery = useMemo(() => {
    if (!isAdmin || !firestore) return null;
    return query(collection(firestore, 'users'), orderBy('createdAt', 'desc'));
  }, [isAdmin, firestore]);

  const { data: users, isLoading: isLoadingUsers } = useCollection<UserProfile>(usersQuery);

  useEffect(() => {
    if (!isUserLoading && !isAdmin) {
      router.push('/dashboard');
    }
  }, [isUserLoading, isAdmin, router]);

  const filteredUsers = useMemo(() => {
    if (!users) return [];
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
