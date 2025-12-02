// src/components/install-pwa-button.tsx
'use client';

import { usePWA } from '@/context/pwa-context';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export function InstallPWAButton() {
  const { canInstall, triggerInstall, isPWA } = usePWA();

  if (isPWA || !canInstall) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.3 }}
      >
        <Button onClick={triggerInstall} variant="outline" size="sm">
          <Download className="mr-2 h-4 w-4" />
          Instalar App
        </Button>
      </motion.div>
    </AnimatePresence>
  );
}
