
// src/components/header.tsx
'use client';

import { Menu, X } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader, SheetClose } from '@/components/ui/sheet';
import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useUser } from '@/firebase';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { motion, AnimatePresence } from 'framer-motion';
import { useScroll } from '@/hooks/use-scroll';
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
        // We need to check for resolvedTheme which is available on the client after mount.
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
  const scrolled = useScroll(10);


  const navLinkStyle = "font-medium text-muted-foreground";

  const navLinks = (
    <>
      <NavLink href="/#features" onClick={() => setSheetOpen(false)} className={navLinkStyle}>Funcionalidades</NavLink>
      <NavLink href="/#testimonials" onClick={() => setSheetOpen(false)} className={navLinkStyle}>Depoimentos</NavLink>
      <NavLink href="/pricing" onClick={() => setSheetOpen(false)} className={navLinkStyle}>Preços</NavLink>
    </>
  );

  return (
    <header className="sticky top-0 z-50 w-full transition-all duration-300">
      <div
        className={cn(
          'container relative mx-auto flex h-20 items-center justify-between transition-all duration-300',
          scrolled && 'h-16'
        )}
      >
        {/* Background element */}
        <motion.div
          initial={false}
          animate={scrolled ? 'scrolled' : 'top'}
          variants={{
            top: {
              backgroundColor: 'rgba(255, 255, 255, 0)',
              backdropFilter: 'blur(0px)',
              boxShadow: '0 0 0 0 rgba(0,0,0,0)',
              borderColor: 'transparent'
            },
            scrolled: {
              backgroundColor: 'hsl(var(--background) / 0.8)',
              backdropFilter: 'blur(12px)',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
              borderColor: 'hsl(var(--border))'
            },
          }}
          transition={{ duration: 0.3 }}
          className="absolute inset-x-4 top-0 mx-auto my-3 h-16 rounded-2xl border"
        />

        {/* Content */}
        <div className="relative z-10 flex w-full items-center justify-between px-6">
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
      </div>
    </header>
  );
}
