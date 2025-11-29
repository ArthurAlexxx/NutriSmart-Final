// src/components/install-pwa-button.tsx
'use client';

import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Download } from 'lucide-react';

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

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e as BeforeInstallPromptEvent);
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
    // Show the install prompt
    deferredPrompt.prompt();
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    // Optionally, send analytics event with the outcome
    console.log(`User response to the install prompt: ${outcome}`);
    // We've used the prompt, and it can't be used again, so we clear it
    setDeferredPrompt(null);
  };

  if (!deferredPrompt) {
    return null;
  }

  return (
    <Button
      variant="outline"
      onClick={handleInstallClick}
      className="gap-2"
    >
      <Download className="h-4 w-4" />
      Instalar App
    </Button>
  );
}
