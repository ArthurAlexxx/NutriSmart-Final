// src/components/pwa-install-modal.tsx
'use client';

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
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
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl p-0">
        <SheetHeader>
          <div className="flex justify-center mb-4">
             {logoImage && <Image src={logoImage.imageUrl} alt="Nutrinea Logo" width={140} height={35} />}
          </div>
          <SheetTitle>Instale o Nutrinea</SheetTitle>
          <SheetDescription>
            Tenha a melhor experiência adicionando nosso aplicativo à sua tela inicial.
          </SheetDescription>
        </SheetHeader>
        <div className="py-4 px-6">
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
        <SheetFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
            Agora não
          </Button>
          <Button type="button" onClick={handleInstall} className="w-full sm:w-auto">
            <Download className="mr-2 h-4 w-4" /> Instalar Aplicativo
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
