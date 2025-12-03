'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Loader2 } from 'lucide-react';

export default function SplashScreen() {
  const logoImage = PlaceHolderImages.find(p => p.id === 'logo');

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeInOut" }}
      >
        {logoImage && (
          <Image
            src={logoImage.imageUrl}
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

    