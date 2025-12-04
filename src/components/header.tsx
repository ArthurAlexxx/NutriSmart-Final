// src/components/header.tsx
'use client';

import { Menu } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader, SheetClose } from '@/components/ui/sheet';
import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useUser } from '@/firebase';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { ThemeToggle } from './ui/theme-toggle';
import { useTheme } from 'next-themes';

const NavLink = ({ href, children, onClick, className }: { href: string; children: React.ReactNode, onClick?: () => void, className?: string }) => {
  const handleAnchorClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (href.startsWith('/#')) {
      e.preventDefault();
      if (onClick) {
        onClick();
      }
      setTimeout(() => {
        const id = href.substring(2);
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 300); // Delay to allow sheet to close
    } else {
      if (onClick) {
        onClick();
      }
    }
  };

  return (
    <Link
      href={href}
      onClick={handleAnchorClick}
      className={cn("transition-colors hover:text-primary text-base", className)}
    >
      {children}
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

    return (
        <Image 
            src={logoUrl}
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
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur-sm">
      <div className="container mx-auto flex h-20 items-center justify-between">
        <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2">
                <LogoDisplay />
            </Link>
        </div>
        
        <nav className="hidden items-center gap-6 md:flex">
            {navLinks}
        </nav>
        
        <div className="flex items-center gap-2">
            <div className='hidden md:flex items-center gap-2'>
              <ThemeToggle />
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
              <SheetContent side="left" className="p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
                  <SheetHeader className="p-6 border-b">
                    <SheetTitle className="text-left">Navegação</SheetTitle>
                  </SheetHeader>
                  <nav className="flex flex-col p-6 gap-4">
                    {navLinks}
                  </nav>
                 <div className='grid grid-cols-2 gap-2 p-6 mt-auto border-t'>
                      {user ? (
                         <Button asChild size="lg" className="w-full">
                            <Link href={effectiveSubscriptionStatus === 'professional' ? "/pro/dashboard" : "/dashboard"} onClick={() => setSheetOpen(false)}>Ir para o App</Link>
                         </Button>
                      ) : (
                        <>
                           <Button asChild variant="secondary" size="lg">
                              <Link href="/login" onClick={() => setSheetOpen(false)}>Login</Link>
                           </Button>
                           <Button asChild size="lg">
                              <Link href="/register" onClick={() => setSheetOpen(false)}>Cadastre-se</Link>
                           </Button>
                        </>
                       )}
                   </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
