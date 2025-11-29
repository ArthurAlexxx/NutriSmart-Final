// src/components/orientation-lock.tsx
'use client';

import { Smartphone } from 'lucide-react';

export default function OrientationLock() {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background text-center p-4">
      <div className="relative mb-8">
        <Smartphone className="h-24 w-24 text-muted-foreground" />
        <div className="absolute inset-0 flex items-center justify-center animate-spin-slow">
            <Smartphone className="h-16 w-16 text-primary" />
        </div>
      </div>
      <h2 className="text-2xl font-bold">Vire o seu dispositivo</h2>
      <p className="text-muted-foreground mt-2 max-w-xs">
        Para uma melhor experiência, por favor, use o modo retrato.
      </p>
    </div>
  );
}

// Add animation to tailwind.config.ts if it's not there
// keyframes: {
//   'spin-slow': {
//     '0%': { transform: 'rotate(0deg)' },
//     '50%': { transform: 'rotate(-90deg)' },
//     '100%': { transform: 'rotate(-90deg)' },
//   },
// },
// animation: {
//  'spin-slow': 'spin-slow 2.5s ease-in-out infinite',
// },
