// src/components/app-layout.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { BarChart3, History, Settings, LogOut, Menu, User as UserIcon, ChefHat, Users, LayoutDashboard, BookMarked, Briefcase, Shield, DollarSign, Library, X, Camera, Webhook, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import type { User } from 'firebase/auth';
import type { UserProfile } from '@/types/user';
import DashboardHeader from './dashboard-header';
import { Separator } from './ui/separator';
import { signOut } from 'firebase/auth';
import { useAuth, useUser, usePWA } from '@/firebase';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Loader2 } from 'lucide-react';
import { motion, PanInfo } from 'framer-motion';
import { useTheme } from 'next-themes';
import { ThemeToggle } from './ui/theme-toggle';

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
  { href: '/live-analysis', label: 'Análise ao Vivo', icon: Camera, id: 'nav-live-analysis', premium: true },
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

const NavLink = ({ id, href, label, icon: Icon, pathname, onClick, disabled = false, isHorizontal = false }: { id?: string; href: string; label: string; icon: React.ElementType; pathname: string; onClick?: () => void; disabled?: boolean; isHorizontal?: boolean; }) => {
  const isActive = pathname.startsWith(href) && (href !== '/dashboard' || pathname === href);

  if (isHorizontal) {
      return (
        <Link
          id={id}
          href={disabled ? '#' : href}
          onClick={disabled ? (e) => e.preventDefault() : onClick}
          className={cn(
            "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors",
            !disabled && "hover:bg-accent/50",
            isActive && !disabled && "bg-primary/10 text-primary",
            disabled && "cursor-not-allowed opacity-60"
          )}
          aria-disabled={disabled}
        >
          {label}
      </Link>
      )
  }

  return (
    <Link
      id={id}
      href={disabled ? '#' : href}
      onClick={disabled ? (e) => e.preventDefault() : onClick}
      className={cn(
        "flex items-center gap-4 rounded-lg px-4 py-3 text-lg md:text-base md:py-2 md:px-3 text-muted-foreground transition-all",
        !disabled && "hover:bg-accent/50 hover:text-primary",
        isActive && !disabled && "bg-primary/10 font-semibold text-primary",
        disabled && "cursor-not-allowed opacity-60"
      )}
      aria-disabled={disabled}
    >
        <Icon className="h-5 w-5" />
        {label}
    </Link>
  );
};

const LogoDisplay = () => {
    const { theme, resolvedTheme } = useTheme();
    const [logoUrl, setLogoUrl] = useState(PlaceHolderImages.find(p => p.id === 'logo')?.imageUrl || '');

    useEffect(() => {
        const currentTheme = theme === 'system' ? resolvedTheme : theme;
        const logoId = currentTheme === 'dark' ? 'logo-dark' : 'logo';
        const newLogo = PlaceHolderImages.find(p => p.id === logoId);
        if (newLogo) {
            setLogoUrl(newLogo.imageUrl);
        }
    }, [theme, resolvedTheme]);

    const LogoComponent = (
        <Image 
            src={logoUrl}
            alt="Nutrinea Logo"
            width={140}
            height={35}
            priority
            style={{ height: 35, width: 'auto' }}
        />
    );

    const { isPWA } = usePWA();
    if (isPWA) {
        return <div className="flex items-center gap-2 font-semibold">{LogoComponent}</div>;
    }

    return (
        <Link href="/" className="flex items-center gap-2 font-semibold">
            {LogoComponent}
        </Link>
    );
};


export default function AppLayout({ user, userProfile, onProfileUpdate, children }: AppLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuth();
  const { isUserLoading, effectiveSubscriptionStatus, isAdmin } = useUser();
  const [isSheetOpen, setSheetOpen] = useState(false);
  
  const isProUser = effectiveSubscriptionStatus === 'professional';

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
  
  const renderNavLinks = (isMobile = false, isHorizontal = false) => {
    const navLinkProps = (item: any) => ({
      ...item,
      pathname: pathname,
      onClick: () => isMobile && setSheetOpen(false),
      isHorizontal,
    });

    const patientLinks = navItemsPatient.map(item => <NavLink key={item.href} {...navLinkProps(item)} disabled={item.premium && isFreeUser} />);
    const proLinks = navItemsPro.map(item => <NavLink key={item.href} {...navLinkProps(item)} />);
    const adminLinks = navItemsAdmin.map(item => <NavLink key={item.href} {...navLinkProps(item)} />);
    
    if (isHorizontal) {
        if(isAdmin) return <>{adminLinks}{proLinks}{patientLinks}</>;
        if(isProUser) return <>{proLinks}{patientLinks}</>;
        return <>{patientLinks}</>;
    }
    
    if (isAdmin) {
        return (
          <>
            <div className='p-4'><h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Admin</h3></div>
            <div className="grid items-start px-4 text-sm font-medium">{adminLinks}</div>
            <Separator className="my-4" />
            <div className='p-4'><h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Profissional</h3></div>
            <div className="grid items-start px-4 text-sm font-medium">{proLinks}</div>
            <Separator className="my-4" />
            <div className='p-4'><h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Paciente</h3></div>
            <div className="grid items-start px-4 text-sm font-medium">{patientLinks}</div>
          </>
        )
    }

    if (isProUser) {
        return (
          <>
            <div className='p-4'><h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Profissional</h3></div>
            <div className="grid items-start px-4 text-sm font-medium">{proLinks}</div>
            <Separator className="my-4" />
            <div className='p-4'><h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Uso Pessoal</h3></div>
            <div className="grid items-start px-4 text-sm font-medium">{patientLinks}</div>
          </>
        );
    }

    return (
        <div className="grid items-start px-4 text-sm font-medium">
            {patientLinks}
        </div>
    );
  };

  const SidebarContent = ({ isMobile = false }) => (
    <>
      <div className="flex-1 py-4 overflow-y-auto">
        {renderNavLinks(isMobile, false)}
      </div>
      <div className='p-4 mt-auto border-t'>
         <Button onClick={handleSignOut} variant='destructive' className='w-full justify-start gap-4'>
            <LogOut className="h-5 w-5" />
            <span>Sair</span>
        </Button>
      </div>
    </>
  );
  
  if (isUserLoading || !userProfile) {
    return (
      <div className="flex min-h-screen w-full flex-col bg-background items-center justify-center">
         <Loader2 className="h-16 w-16 animate-spin text-primary" />
         <p className="mt-4 text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.x > 100 && info.velocity.x > 200 && Math.abs(info.point.x - info.offset.x) < 50) {
      setSheetOpen(true);
    }
  };

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      <div className="hidden border-r bg-muted/40 md:flex md:flex-col no-print">
         <div className="flex h-header items-center border-b px-6">
            <LogoDisplay />
         </div>
        <SidebarContent />
      </div>
      <div className="flex flex-col">
        <header className="sticky top-0 z-30 flex h-header items-center gap-4 border-b bg-muted/40 px-4 py-3 backdrop-blur-lg sm:px-6 no-print [app-region:drag]">
            <Sheet open={isSheetOpen} onOpenChange={setSheetOpen}>
                <SheetTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 md:hidden [app-region:no-drag]"
                    >
                        <Menu className="h-5 w-5" />
                        <span className="sr-only">Toggle navigation menu</span>
                    </Button>
                </SheetTrigger>
                <SheetContent side="left" className="flex flex-col p-0 w-full max-w-sm" closeButton={false}>
                    <SheetHeader className="flex flex-row items-center justify-between border-b p-4 h-header">
                        <LogoDisplay />
                        <SheetClose asChild>
                            <Button variant="ghost" size="icon" className="rounded-full">
                                <X className="h-5 w-5" />
                                <span className="sr-only">Close</span>
                            </Button>
                        </SheetClose>
                        <SheetTitle className='sr-only'>Menu Principal</SheetTitle>
                    </SheetHeader>
                    <SidebarContent isMobile />
                </SheetContent>
            </Sheet>

            <div className="flex w-full items-center gap-4 md:ml-auto md:gap-2 lg:gap-4 [app-region:no-drag]">
                <div className="ml-auto flex-1 sm:flex-initial">
                    {/* Pode adicionar um search bar aqui no futuro */}
                </div>
                <ThemeToggle />
                <DashboardHeader
                    user={user}
                    userProfile={userProfile}
                />
            </div>
        </header>
        <main className={cn(
          "relative flex flex-1 flex-col gap-4 bg-muted/40 print:bg-white print:p-0", 
          pathname.startsWith('/chef') || pathname.startsWith('/live-analysis') ? 'overflow-hidden' : 'overflow-y-auto'
        )}>
          {children}
        </main>
      </div>
    </div>
  );
}
