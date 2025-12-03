// src/components/dashboard-header.tsx
'use client';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { LogOut, User as UserIcon, Settings } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { User } from 'firebase/auth';
import { type UserProfile } from '@/types/user';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';
import { InstallPWAButton } from './install-pwa-button';
import Link from 'next/link';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from '@/components/ui/sheet';


interface DashboardHeaderProps {
  user: User | null;
  userProfile: UserProfile | null;
}

export default function DashboardHeader({ user, userProfile }: DashboardHeaderProps) {
  const router = useRouter();
  const auth = useAuth();
  
  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.push('/');
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  const userName = userProfile?.fullName || user?.displayName || 'Visitante';
  const userEmail = user?.email || 'visitante@email.com';

  return (
    <>
      <div className="hidden md:flex items-center gap-4">
          <InstallPWAButton />
          <Sheet>
            <SheetTrigger asChild>
              <Button id="user-profile-button" variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={userProfile?.photoURL || user?.photoURL || undefined} alt={userName} />
                  <AvatarFallback>
                    {userName?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </SheetTrigger>
            <SheetContent>
                <SheetHeader className='text-left'>
                    <SheetTitle>
                        <p className='font-semibold'>{userName}</p>
                        <p className='text-sm font-normal text-muted-foreground'>{userEmail}</p>
                    </SheetTitle>
                </SheetHeader>
              <div className="mt-6 flex flex-col gap-2">
                <SheetClose asChild>
                    <Link href="/profile" className='w-full'>
                       <Button variant='outline' className='w-full justify-start gap-2'>
                         <Settings className="h-4 w-4" />
                         <span>Configurações</span>
                       </Button>
                    </Link>
                </SheetClose>
                <Button onClick={handleSignOut} variant='destructive' className='w-full justify-start gap-2'>
                    <LogOut className="h-4 w-4" />
                    <span>Sair</span>
                </Button>
              </div>
            </SheetContent>
          </Sheet>
      </div>
    </>
  );
}
