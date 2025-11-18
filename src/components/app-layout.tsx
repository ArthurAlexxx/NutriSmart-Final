// src/components/app-layout.tsx
'use client';

import React, { useState, useMemo, useEffect, useContext } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { BarChart3, History, Settings, LogOut, Menu, User as UserIcon, ChefHat, Users, LayoutDashboard, BookMarked, Briefcase, Settings2, UserPlus, Shield, CreditCard, Building, Library, X, DollarSign, MoreHorizontal, Lock, AlarmClock, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import type { User } from 'firebase/auth';
import type { UserProfile } from '@/types/user';
import DashboardHeader from './dashboard-header';
import { Separator } from './ui/separator';
import { Skeleton } from './ui/skeleton';
import { signOut } from 'firebase/auth';
import { useAuth } from '@/firebase';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import ProfileSettingsModal from './profile-settings-modal';
import SubscriptionOverlay from './subscription-overlay';

interface AppLayoutProps {
  user: User | null;
  userProfile: UserProfile | null;
  onProfileUpdate: (updatedProfile: Partial<UserProfile>) => void;
  children: React.ReactNode;
}

const navItemsPatient = [
  { href: '/dashboard', label: 'Meu Diário', icon: LayoutDashboard, premium: false, id: 'nav-dashboard' },
  { href: '/analysis', label: 'Minha Análise', icon: BarChart3, premium: true, id: 'nav-analysis' },
  { href: '/plan', label: 'Meu Plano (IA)', icon: BookMarked, premium: true, id: 'nav-plan' },
  { href: '/chef', label: 'Chef Virtual', icon: ChefHat, premium: true, id: 'nav-chef' },
  { href: '/history', label: 'Meu Histórico', icon: History, premium: false, id: 'nav-history' },
];

const navItemsPro = [
    { href: '/pro/dashboard', label: 'Visão Geral', icon: LayoutDashboard },
    { href: '/pro/patients', label: 'Pacientes', icon: Users },
    { href: '/pro/library', label: 'Biblioteca', icon: Library },
    { href: '/pro/finance', label: 'Financeiro', icon: DollarSign },
];

const NavLink = ({ id, href, label, icon: Icon, pathname, onClick, disabled = false }: { id?: string; href: string; label: string; icon: React.ElementType; pathname: string; onClick?: () => void; disabled?: boolean; }) => {
  const isActive = pathname === href || (href !== '/dashboard' && href !== '/pro/dashboard' && pathname.startsWith(href));

  const linkContent = (
    <>
        <Icon className="h-5 w-5" />
        {label}
        {disabled && <Lock className='ml-auto h-4 w-4 text-primary-foreground/50'/>}
    </>
  );

  return (
    <Link
      id={id}
      href={disabled ? '#' : href}
      onClick={disabled ? (e) => e.preventDefault() : onClick}
      className={cn(
        "flex items-center gap-4 rounded-lg px-4 py-3 text-lg md:text-base md:py-2 md:px-3 text-muted-foreground transition-all",
        !disabled && "hover:bg-primary/10 hover:text-primary",
        isActive && !disabled && "bg-primary text-primary-foreground font-semibold hover:bg-primary/90 hover:text-primary-foreground",
        disabled && "cursor-not-allowed opacity-60"
      )}
      aria-disabled={disabled}
    >
      {linkContent}
    </Link>
  );
};

const NavSection = ({ title, children }: { title: string, children: React.ReactNode }) => (
    <div className='px-4 mt-4'>
        <h3 className="mb-2 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</h3>
        <div className="grid items-start text-sm font-medium">
            {children}
        </div>
    </div>
);

const LogoDisplay = () => {
    return <span className="text-xl font-semibold">NutriSmart</span>;
};


export default function AppLayout({ user, userProfile, onProfileUpdate, children }: AppLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuth();
  const [isSheetOpen, setSheetOpen] = useState(false);
  const [isProfileModalOpen, setProfileModalOpen] = useState(false);

  const hasAccess = true; // All features unlocked for now
  
  const handleSignOut = async () => {
    if (!auth) return;
    try {
        await signOut(auth);
        setSheetOpen(false);
        router.push('/');
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  const isProUser = userProfile?.profileType === 'professional';
  const isChefPage = pathname === '/chef';
  
  const renderNavLinks = (isMobile = false) => {
    const navLinkProps = (item: any) => ({
      ...item,
      pathname: pathname,
      onClick: () => isMobile && setSheetOpen(false),
      disabled: item.premium && !hasAccess
    });

    if (isProUser) {
        return (
          <>
            <NavSection title="Menu Profissional">
              {navItemsPro.map(item => <NavLink key={item.href} {...navLinkProps(item)} />)}
            </NavSection>
            <Separator className="my-4" />
            <NavSection title="Uso Pessoal">
              {navItemsPatient.map(item => <NavLink key={item.href} {...navLinkProps(item)} />)}
            </NavSection>
          </>
        );
    }

    return (
        <NavSection title="Menu">
            {navItemsPatient.map(item => <NavLink key={item.href} {...navLinkProps(item)} />)}
        </NavSection>
    );
  };
  
  const showOverlay = false; // All features are unlocked, so never show the overlay

  return (
    <>
      <div className={cn("grid h-screen w-full md:grid-cols-[260px_1fr]", isChefPage ? "min-h-dvh" : "")}>
        <div className="hidden border-r bg-sidebar-background md:block no-print">
          <div className="flex h-full max-h-screen flex-col">
            <div className="flex h-20 items-center border-b px-6">
              <Link href="/" className="flex items-center gap-2 font-semibold">
                <LogoDisplay />
              </Link>
            </div>
            <div className="flex-1 py-4 overflow-y-auto">
              {renderNavLinks()}
            </div>
          </div>
        </div>
        <div className="flex flex-col h-screen">
          <header className="sticky top-0 z-30 flex h-20 shrink-0 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur-lg sm:px-6 no-print">
              <Sheet open={isSheetOpen} onOpenChange={setSheetOpen}>
                  <SheetTrigger asChild>
                      <Button
                          variant="outline"
                          size="icon"
                          className="shrink-0 md:hidden"
                      >
                          <Menu className="h-5 w-5" />
                          <span className="sr-only">Toggle navigation menu</span>
                      </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="flex flex-col p-0 w-full max-w-sm" closeButton={false}>
                      <SheetHeader className="flex flex-row items-center justify-between border-b p-4 h-20">
                          <Link href="/" className="flex items-center gap-2 font-semibold" onClick={() => setSheetOpen(false)}>
                            <LogoDisplay />
                          </Link>
                           <SheetClose className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary">
                              <X className="h-5 w-5" />
                              <span className="sr-only">Close</span>
                          </SheetClose>
                          <SheetTitle className='sr-only'>Menu Principal</SheetTitle>
                      </SheetHeader>
                      <div className="flex-1 overflow-y-auto py-4">
                          {renderNavLinks(true)}
                      </div>
                       <div className="mt-auto border-t p-2">
                           <button 
                                onClick={() => {
                                  setProfileModalOpen(true);
                                  setSheetOpen(false);
                                }}
                                className="group flex w-full cursor-pointer items-center gap-3 rounded-lg p-2 transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            >
                                <Avatar className="h-10 w-10 border">
                                    <AvatarImage src={user?.photoURL || ''} alt={userProfile?.fullName} />
                                    <AvatarFallback>{userProfile?.fullName?.[0]}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 overflow-hidden text-left">
                                    <p className="font-semibold text-sm truncate">{userProfile?.fullName}</p>
                                    <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                                </div>
                           </button>
                      </div>
                  </SheetContent>
              </Sheet>
              
              <div className="w-full flex-1 md:hidden">
                {/* This div is to push the profile button to the right on mobile */}
              </div>

              <div className='hidden md:flex flex-1 justify-end'>
                <DashboardHeader
                    user={user}
                    userProfile={userProfile}
                    onProfileUpdate={onProfileUpdate}
                />
              </div>
          </header>
          <main className={cn("relative bg-muted/40 print:bg-white print:p-0 overflow-y-auto", isChefPage ? "flex-1 flex flex-col min-h-0" : "flex-1")}>
              <div className={cn("h-full", isChefPage ? "flex-1 flex flex-col min-h-0" : "p-4 sm:p-6 lg:p-8")}>
                  {showOverlay && <SubscriptionOverlay />}
                  {children}
              </div>
          </main>
        </div>
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
