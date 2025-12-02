// src/components/header.tsx
'use client';

import { Menu, Download } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useUser } from '@/firebase';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { InstallPWAButton } from './install-pwa-button';

const NavLink = ({ href, children, onClick, className }: { href: string; children: React.ReactNode, onClick?: () => void, className?: string }) => (
  <Link
    href={href}
    onClick={onClick}
    className={cn("transition-colors hover:text-primary text-base", className)}
  >
    {children}
  </Link>
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


export default function Header() {
  const [isSheetOpen, setSheetOpen] = useState(false);
  const { user, effectiveSubscriptionStatus } = useUser();

  const navLinkStyle = "font-medium text-muted-foreground";

  const navLinks = (
    <>
      <NavLink href="/#features" onClick={() => setSheetOpen(false)} className={navLinkStyle}>Funcionalidades</NavLink>
      <NavLink href="/#testimonials" onClick={() => setSheetOpen(false)} className={navLinkStyle}>Depoimentos</NavLink>
      <NavLink href="/pricing" onClick={() => setSheetOpen(false)} className={navLinkStyle}>Preços</NavLink>
    </>
  );

  return (
    <header className='sticky top-0 w-full border-b bg-background z-50'>
      <div className="container flex h-20 items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
            <LogoDisplay />
        </Link>
        
        <nav className="hidden items-center gap-8 md:flex">
          {navLinks}
        </nav>

        <div className="flex items-center gap-2">
            <div className='hidden md:flex items-center gap-2'>
              <InstallPWAButton />
              {user ? (
                 <Button asChild className="rounded-full">
                   <Link href={effectiveSubscriptionStatus === 'professional' ? "/pro/dashboard" : "/dashboard"}>Ir para o App</Link>
                </Button>
              ) : (
                <>
                   <Button asChild variant="outline" className="rounded-full">
                       <Link href="/login">Login</Link>
                   </Button>
                   <Button asChild className="rounded-full">
                       <Link href="/register">Cadastre-se</Link>
                   </Button>
                </>
              )}
            </div>

          <div className="md:hidden">
            <Sheet open={isSheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Menu de Navegação</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right">
                <SheetTitle className="sr-only">Menu de Navegação</SheetTitle>
                 <Link href="/" className="flex items-center gap-2 border-b pb-6 mb-6">
                    <LogoDisplay />
                </Link>
                <nav className="grid gap-6">
                  {navLinks}
                  <div className='grid gap-4 pt-6 border-t'>
                      {user ? (
                         <Button asChild>
                            <Link href={effectiveSubscriptionStatus === 'professional' ? "/pro/dashboard" : "/dashboard"} onClick={() => setSheetOpen(false)}>Ir para o App</Link>
                         </Button>
                      ) : (
                        <>
                           <Button asChild>
                              <Link href="/login" onClick={() => setSheetOpen(false)}>Login</Link>
                           </Button>
                           <Button asChild variant="secondary">
                              <Link href="/register" onClick={() => setSheetOpen(false)}>Cadastre-se</Link>
                           </Button>
                        </>
                       )}
                   </div>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
