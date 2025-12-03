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
  const [isScrolled, setIsScrolled] = useState(false);
  const { user, effectiveSubscriptionStatus } = useUser();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const navLinkStyle = "font-medium text-muted-foreground";

  const navLinks = (
    <>
      <NavLink href="/#features" onClick={() => setSheetOpen(false)} className={navLinkStyle}>Funcionalidades</NavLink>
      <NavLink href="/#testimonials" onClick={() => setSheetOpen(false)} className={navLinkStyle}>Depoimentos</NavLink>
      <NavLink href="/pricing" onClick={() => setSheetOpen(false)} className={navLinkStyle}>Preços</NavLink>
    </>
  );

  return (
    <header className='fixed top-0 w-full z-50 transition-all duration-300'>
      <AnimatePresence>
        {isScrolled ? (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="container my-3"
          >
            <div className="flex h-16 items-center justify-between px-6 rounded-2xl bg-background/80 backdrop-blur-lg border shadow-lg">
                <Link href="/" className="flex items-center gap-2">
                    <LogoDisplay />
                </Link>
                <nav className="hidden items-center gap-6 md:flex">
                    {navLinks}
                </nav>
                <div className="flex items-center gap-2">
                    <div className='hidden md:flex items-center gap-2'>
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
                        {/* Mobile menu remains the same */}
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
        ) : (
           <div className="container flex h-20 items-center justify-between border-b border-transparent">
             <Link href="/" className="flex items-center gap-2">
                <LogoDisplay />
            </Link>
            
            <nav className="hidden items-center gap-8 md:flex">
              {navLinks}
            </nav>

            <div className="flex items-center gap-2">
                <div className='hidden md:flex items-center gap-2'>
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
        )}
      </AnimatePresence>
    </header>
  );
}
