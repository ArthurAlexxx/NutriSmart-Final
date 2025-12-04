
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
    <header className={cn(
        "top-0 w-full z-50 transition-all duration-300",
        scrolled ? "sticky" : "relative"
    )}>
        {/* Scrolled State */}
        <AnimatePresence>
            {scrolled && (
                 <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="container my-3 mx-auto px-4 sm:px-6 lg:px-8"
                >
                    <div className="mx-auto flex h-16 items-center justify-center gap-8 rounded-2xl bg-background/80 px-6 shadow-lg backdrop-blur-lg border transition-all duration-300 sm:px-6">
                        <Link href="/" className="flex items-center gap-2">
                            <LogoDisplay />
                        </Link>
                        <nav className="hidden items-center gap-6 md:flex">
                            {navLinks}
                        </nav>
                        <div className="flex items-center gap-2">
                            <div className='hidden md:flex items-center gap-2'>
                               <ThemeToggle />
                               {user ? (
                                 <Button asChild size="sm">
                                   <Link href={effectiveSubscriptionStatus === 'professional' ? "/pro/dashboard" : "/dashboard"}>Ir para o App</Link>
                                </Button>
                              ) : (
                                <>
                                   <Button asChild variant="ghost" size="sm">
                                       <Link href="/login">Login</Link>
                                   </Button>
                                   <Button asChild size="sm">
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
                                  <SheetContent side="right" className="flex flex-col p-0 w-full max-w-sm" closeButton={false}>
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
                                    <nav className="flex flex-col flex-1 p-6 gap-6">
                                      {navLinks}
                                    </nav>
                                     <div className='grid gap-4 p-6 pt-0 border-t mt-auto'>
                                          <ThemeToggle />
                                          {user ? (
                                             <Button asChild size="lg">
                                                <Link href={effectiveSubscriptionStatus === 'professional' ? "/pro/dashboard" : "/dashboard"} onClick={() => setSheetOpen(false)}>Ir para o App</Link>
                                             </Button>
                                          ) : (
                                            <>
                                               <Button asChild size="lg">
                                                  <Link href="/login" onClick={() => setSheetOpen(false)}>Login</Link>
                                               </Button>
                                               <Button asChild variant="secondary" size="lg">
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
                 </motion.div>
            )}
        </AnimatePresence>
        
        {/* Top State */}
        <div className={cn("container flex h-20 items-center justify-between border-b border-transparent", scrolled && "hidden")}>
             <Link href="/" className="flex items-center gap-2">
                <LogoDisplay />
            </Link>
            
            <nav className="hidden items-center gap-8 md:flex">
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
                  <SheetContent side="right" className="flex flex-col p-0 w-full max-w-sm" closeButton={false}>
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
                    <nav className="flex flex-col flex-1 p-6 gap-6">
                      {navLinks}
                    </nav>
                     <div className='grid gap-4 p-6 pt-0 border-t mt-auto'>
                          <ThemeToggle />
                          {user ? (
                             <Button asChild size="lg">
                                <Link href={effectiveSubscriptionStatus === 'professional' ? "/pro/dashboard" : "/dashboard"} onClick={() => setSheetOpen(false)}>Ir para o App</Link>
                             </Button>
                          ) : (
                            <>
                               <Button asChild size="lg">
                                  <Link href="/login" onClick={() => setSheetOpen(false)}>Login</Link>
                               </Button>
                               <Button asChild variant="secondary" size="lg">
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
