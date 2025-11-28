// src/app/pricing/page.tsx
"use client";

import Header from '@/components/header';
import Footer from '@/components/footer';
import { Pricing as PricingSection } from '@/components/ui/pricing';

export default function PricingPage() {
    return (
        <div className="flex min-h-dvh flex-col bg-background font-sans">
            <Header />
            <main className="flex-1">
                 <PricingSection />
            </main>
            <Footer />
        </div>
    );
}
