// src/components/pwa-install-modal.tsx
'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Smartphone, Star } from 'lucide-react';
import { usePWA } from '@/context/pwa-context';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import Image from 'next/image';

interface PWAInstallModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

const benefits = [
    { icon: Smartphone, text: 'Acesso rápido pela tela inicial' },
    { icon: Star, text: 'Experiência mais fluida e integrada' },
];

export default function PWAInstallModal({ isOpen, onOpenChange }: PWAInstallModalProps) {
  const { triggerInstall } = usePWA();
  const logoImage = PlaceHolderImages.find(p => p.id === 'logo');

  const handleInstall = () => {
    triggerInstall();
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex justify-center mb-4">
             {logoImage && <Image src={logoImage.imageUrl} alt="Nutrinea Logo" width={140} height={35} />}
          </div>
          <DialogTitle className="text-center text-2xl font-bold">Instale o Nutrinea</DialogTitle>
          <DialogDescription className="text-center">
            Tenha a melhor experiência adicionando nosso aplicativo à sua tela inicial.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
            <ul className="space-y-3">
                {benefits.map((benefit, index) => (
                    <li key={index} className="flex items-center gap-3">
                        <div className="bg-primary/10 text-primary p-2 rounded-full">
                           <benefit.icon className="h-5 w-5" />
                        </div>
                        <span className="text-foreground font-medium">{benefit.text}</span>
                    </li>
                ))}
            </ul>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Agora não
          </Button>
          <Button type="button" onClick={handleInstall}>
            <Download className="mr-2 h-4 w-4" /> Instalar Aplicativo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
