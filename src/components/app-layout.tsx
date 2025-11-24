// src/components/app-layout.tsx
'use client';

import React, { useState, useMemo, useEffect, useContext } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { BarChart3, History, Settings, LogOut, Menu, User as UserIcon, ChefHat, Users, LayoutDashboard, BookMarked, Briefcase, Settings2, UserPlus, Shield, CreditCard, Building, Library, X, DollarSign, MoreHorizontal, Lock, AlarmClock, QrCode, Webhook } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import type { User } from 'firebase/auth';
import type { UserProfile } from '@/types/user';
import DashboardHeader from './dashboard-header';
import { Separator } from './ui/separator';
import { Skeleton } from './ui/skeleton';
import { signOut } from 'firebase/auth';
import { useAuth, useUser } from '@/firebase';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import ProfileSettingsModal from './profile-settings-modal';
import { differenceInDays, differenceInHours } from 'date-fns';
import { PlaceHolderImages } from '@/lib/placeholder-images';

interface AppLayoutProps {
  user: User | null;
  userProfile: UserProfile | null;
  onProfileUpdate: (updatedProfile: Partial<UserProfile>) => void;
  children: React.ReactNode;
}

const navItemsPatient = [
  { href: '/dashboard', label: 'Meu Diário', icon: LayoutDashboard, id: 'nav-dashboard', premium: false },
  { href: '/analysis', label: 'Minha Análise', icon: BarChart3, id: 'nav-analysis', premium: true },
  { href: '/plan', label: 'Meu Plano (IA)', icon: BookMarked, id: 'nav-plan', premium: true },
  { href: '/chef', label: 'Chef Virtual', icon: ChefHat, id: 'nav-chef', premium: true },
  { href: '/history', label: 'Meu Histórico', icon: History, id: 'nav-history', premium: false },
];

const navItemsPro = [
    { href: '/pro/patients', label: 'Pacientes', icon: Users },
    { href: '/pro/library', label: 'Biblioteca', icon: Library },
];

const navItemsAdmin = [
    { href: '/admin', label: 'Métricas', icon: BarChart3, id: 'nav-admin-metrics' },
    { href: '/admin/users', label: 'Usuários', icon: Users, id: 'nav-admin-users' },
    { href: '/admin/finance', label: 'Financeiro', icon: DollarSign, id: 'nav-admin-finance' },
    { href: '/admin/logs', label: 'Logs', icon: Webhook, id: 'nav-admin-logs' },
];


const NavLink = ({ id, href, label, icon: Icon, pathname, onClick, disabled = false }: { id?: string; href: string; label: string; icon: React.ElementType; pathname: string; onClick?: () => void; disabled?: boolean; }) => {
  const isDashboard = href === '/dashboard' || href === '/pro/dashboard' || href === '/admin';
  const isActive = isDashboard ? pathname.startsWith(href) && (pathname === href || !pathname.substring(href.length).includes('/')) : pathname === href;


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
    const logoImage = PlaceHolderImages.find(p => p.id === 'logo');
    return (
        <Image 
            src={logoImage?.imageUrl || ''}
            alt="Nutrinea Logo"
            width={140}
            height={35}
            priority
        />
    );
};


export default function AppLayout({ user, userProfile, onProfileUpdate, children }: AppLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuth();
  const [isSheetOpen, setSheetOpen] = useState(false);
  const [isProfileModalOpen, setProfileModalOpen] = useState(false);

  const { effectiveSubscriptionStatus, isAdmin } = useUser();
  const isProUser = effectiveSubscriptionStatus === 'professional';

  useEffect(() => {
    if (user && !isProUser && pathname.startsWith('/pro')) {
        router.replace('/dashboard');
    }
  }, [isProUser, pathname, router, user]);

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

  const isFreeUser = effectiveSubscriptionStatus === 'free';
  
  const renderNavLinks = (isMobile = false) => {
    const navLinkProps = (item: any) => ({
      ...item,
      pathname: pathname,
      onClick: () => isMobile && setSheetOpen(false),
    });
    
    if (isAdmin) {
        return (
            <NavSection title="Admin">
                {navItemsAdmin.map(item => <NavLink key={item.href} {...navLinkProps(item)} />)}
            </NavSection>
        )
    }

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

    // Default to patient menu for free and premium non-pro users
    return (
        <NavSection title="Menu">
            {navItemsPatient.map(item => <NavLink key={item.href} {...navLinkProps(item)} disabled={item.premium && isFreeUser} />)}
        </NavSection>
    );
  };

  const SidebarContent = ({ isMobile = false }) => (
    <>
      <div className="flex-1 py-4 overflow-y-auto">
        {renderNavLinks(isMobile)}
      </div>
    </>
  );

  return (
    <>
      <div className={"grid h-screen w-full md:grid-cols-[260px_1fr]"}>
        <div className="hidden border-r bg-sidebar-background md:flex md:flex-col no-print">
            <div className="flex h-20 items-center border-b px-6">
              <Link href="/" className="flex items-center gap-2 font-semibold">
                <LogoDisplay />
              </Link>
            </div>
            <SidebarContent />
        </div>
        <div className="flex flex-col h-screen overflow-hidden">
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
                      <SidebarContent isMobile />
                       <div className="mt-auto border-t p-2">
                           <button 
                                onClick={() => {
                                  setProfileModalOpen(true);
                                  setSheetOpen(false);
                                }}
                                className="group flex w-full cursor-pointer items-center gap-3 rounded-lg p-2 transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            >
                                <Avatar className="h-10 w-10 border">
                                    <AvatarImage src={userProfile?.photoURL || user?.photoURL || ''} alt={userProfile?.fullName} />
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
                />
              </div>
          </header>
          <main className={cn(
            "relative flex-1 bg-muted/40 print:bg-white print:p-0", 
            pathname.startsWith('/chef') ? 'overflow-hidden' : 'overflow-y-auto'
          )}>
            {children}
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
