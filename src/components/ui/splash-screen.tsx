// src/components/ui/splash-screen.tsx
'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Loader2 } from 'lucide-react';
import { useTheme } from 'next-themes';

export default function SplashScreen() {
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
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeInOut" }}
      >
        {logoUrl && (
          <Image
            src={logoUrl}
            alt="Nutrinea Logo"
            width={180}
            height={45}
            priority
            className="mb-8"
          />
        )}
      </motion.div>
      <div className="absolute bottom-16">
          <Loader2 className="h-8 w-8 animate-spin-slow text-primary/50" />
      </div>
    </div>
  );
}
