
// src/components/install-pwa-button.tsx
'use client';

import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Download, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: Array<string>;
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed',
    platform: string
  }>;
  prompt(): Promise<void>;
}

export default function InstallPWAButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // @ts-ignore
      if (window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches) {
        return;
      }
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    setDeferredPrompt(null);
    setIsVisible(false);
  };
  
  const handleDismiss = () => {
    setIsVisible(false);
  }

  if (!isVisible) {
    return null;
  }

  return (
    <AnimatePresence>
        <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="fixed bottom-6 left-6 z-[200]"
        >
            <div className="relative bg-background border shadow-xl rounded-2xl p-4 flex items-center gap-4">
                 <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Download className="w-6 h-6 text-primary" />
                </div>
                <div className='pr-8'>
                    <h3 className="font-semibold text-foreground">Instalar Aplicativo</h3>
                    <p className="text-sm text-muted-foreground">Adicione à sua tela inicial para uma melhor experiência.</p>
                </div>
                <div className='pl-2'>
                    <Button onClick={handleInstallClick} size="sm" className='ml-2'>Instalar</Button>
                </div>
                 <Button onClick={handleDismiss} variant="ghost" size="icon" className='h-7 w-7 absolute top-1 right-1 text-muted-foreground'>
                    <X className="h-4 w-4"/>
                </Button>
            </div>
        </motion.div>
    </AnimatePresence>
  );
}
