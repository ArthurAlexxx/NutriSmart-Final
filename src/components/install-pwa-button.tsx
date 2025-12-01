// src/components/install-pwa-button.tsx
'use client';

import { useEffect } from 'react';
import { Button } from './ui/button';
import { Download, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePWA } from '@/context/pwa-context';

export default function InstallPWAButton() {
  const { isInstallable, isInstallPromptVisible, promptToInstall, hideInstallPrompt } = usePWA();

  useEffect(() => {
    // The logic to show/hide is now handled by the context based on installability
  }, [isInstallable]);

  const handleInstallClick = async () => {
    await promptToInstall();
  };
  
  const handleDismiss = () => {
    hideInstallPrompt();
  };

  if (!isInstallPromptVisible) {
    return null;
  }

  return (
    <AnimatePresence>
        <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="fixed bottom-6 left-6 z-[90]" // z-index lower than toast
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
                    <span className="sr-only">Fechar</span>
                </Button>
            </div>
        </motion.div>
    </AnimatePresence>
  );
}
