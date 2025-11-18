// src/app/pricing/page.tsx
'use client';

import { Suspense } from 'react';
import { Pricing } from '@/components/ui/pricing';
import Footer from '@/components/footer';
import Header from '@/components/header';
import { Skeleton } from '@/components/ui/skeleton';

const LoadingSkeleton = () => (
   <div className="flex min-h-dvh flex-col bg-background font-sans overflow-x-hidden">
    <header className="sticky top-0 z-50 w-full border-b bg-background h-20 flex items-center container">
      <Skeleton className="h-8 w-32" />
      <div className="ml-auto flex gap-2">
        <Skeleton className="h-10 w-24 rounded-full" />
        <Skeleton className="h-10 w-24 rounded-full" />
      </div>
    </header>
     <main className="flex-1 container py-12">
        <Skeleton className="h-24 w-1/2 mx-auto" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
            <Skeleton className="h-96 w-full" />
            <Skeleton className="h-96 w-full" />
        </div>
     </main>
     <footer className="w-full border-t bg-secondary/30 py-12 container">
        <Skeleton className="h-8 w-48" />
     </footer>
   </div>
);

function PricingContent() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1 container">
        <Pricing />
      </main>
      <Footer />
    </div>
  );
}

export default function PricingPage() {
    return (
        <Suspense fallback={<LoadingSkeleton />}>
            <PricingContent />
        </Suspense>
    );
}
