// src/app/pro/dashboard/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

// This page acts as a guard and redirector for the professional section.
export default function ProDashboardPage() {
  const router = useRouter();

  useEffect(() => {
    // The primary dashboard for professionals is the patient management screen.
    router.replace('/pro/patients');
  }, [router]);

  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-background">
      <Loader2 className="h-16 w-16 animate-spin text-primary" />
      <p className="mt-4 text-muted-foreground">Redirecionando para sua área...</p>
    </div>
  );
}
