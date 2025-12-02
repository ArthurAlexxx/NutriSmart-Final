// src/components/dashboard-header.tsx
'use client';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { LogOut, User as UserIcon, Settings, Download } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { User } from 'firebase/auth';
import { type UserProfile } from '@/types/user';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';
import ProfileSettingsModal from './profile-settings-modal';
import { InstallPWAButton } from './install-pwa-button';


interface DashboardHeaderProps {
  user: User | null;
  userProfile: UserProfile | null;
}

export default function DashboardHeader({ user, userProfile }: DashboardHeaderProps) {
  const router = useRouter();
  const auth = useAuth();
  const [isProfileModalOpen, setProfileModalOpen] = useState(false);

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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button id="user-profile-button" variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={userProfile?.photoURL || user?.photoURL || undefined} alt={userName} />
                  <AvatarFallback>
                    {userName?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                    <p className='font-semibold'>{userName}</p>
                    <p className='text-xs font-normal text-muted-foreground'>{userEmail}</p>
                </DropdownMenuLabel>
              <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setProfileModalOpen(true)}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Configurações</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <DropdownMenuItem
                      onSelect={(e) => e.preventDefault()}
                      className="text-red-500 focus:text-red-500 focus:bg-red-50/80"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Sair</span>
                    </DropdownMenuItem>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Isso encerrará sua sessão atual e você precisará fazer login novamente.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleSignOut}
                        className="bg-destructive hover:bg-destructive/90"
                      >
                        Confirmar Saída
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
            </DropdownMenuContent>
          </DropdownMenu>
      </div>
      
      {userProfile && user && (
         <ProfileSettingsModal
            isOpen={isProfileModalOpen}
            onOpenChange={setProfileModalOpen}
            userProfile={userProfile}
            userId={user.uid}
         />
      )}
    </>
  );
}
