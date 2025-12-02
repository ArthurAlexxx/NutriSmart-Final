// src/components/water-tracker-modal.tsx
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from './ui/button';
import { Minus, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

interface WaterTrackerModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  waterIntake: number;
  waterGoal: number;
  onWaterUpdate: (newIntake: number) => Promise<void>;
}

const CUP_SIZE = 250; // ml

function debounce<F extends (...args: any[]) => any>(func: F, waitFor: number) {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<F>): void => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), waitFor);
  };
}

const WaterBottle = ({ progress }: { progress: number }) => {
    const isOverflowing = progress > 100;
    const waterHeight = Math.min(progress, 100);

    return (
        <div className="relative w-32 h-52">
            {/* Bottle Shape SVG */}
            <svg width="128" height="208" viewBox="0 0 128 208" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute inset-0 z-10">
                 <path d="M34.5 1H93.5V13H106.5V23H112.5V207H15.5V23H21.5V13H34.5Z" fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth="2"/>
                <path d="M34.5 5H93.5" stroke="hsl(var(--border))" strokeOpacity="0.5" strokeWidth="1"/>
                 <rect x="100.5" y="1" width="6" height="12" fill="hsl(var(--muted) / 0.5)" />
            </svg>

            {/* Water Fill */}
            <motion.div
                className="absolute bottom-0 left-0 w-full bg-blue-400"
                style={{
                    maskImage: 'url(\'data:image/svg+xml;utf8,<svg width="128" height="208" viewBox="0 0 128 208" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15.5 207V23H21.5V13H34.5V1H93.5V13H106.5V23H112.5V207H15.5Z" fill="black"/></svg>\')',
                    maskSize: '100% 100%',
                    borderBottomLeftRadius: '0.75rem', // Corresponds to rounded-lg
                    borderBottomRightRadius: '0.75rem',
                }}
                initial={{ height: 0 }}
                animate={{ height: `${waterHeight}%` }}
                transition={{ duration: 0.7, ease: "easeOut" }}
            />

            {/* Overflow Animation */}
            <AnimatePresence>
                {isOverflowing && (
                    <>
                        {[...Array(3)].map((_, i) => (
                             <motion.div
                                key={`drip-${i}`}
                                className="absolute left-1/2 w-2 h-2 bg-blue-400 rounded-full"
                                initial={{ y: 20, x: '-50%', opacity: 1, scale: 1 }}
                                animate={{ y: [-10, -20], x: ['-50%', `${(i - 1) * 20 - 50}%`], opacity: 0, scale: [1, 1.5, 0.5] }}
                                exit={{ opacity: 0 }}
                                transition={{
                                    duration: 1 + i * 0.2,
                                    repeat: Infinity,
                                    delay: i * 0.3,
                                    ease: "easeOut"
                                }}
                            />
                        ))}
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};


export default function WaterTrackerModal({ isOpen, onOpenChange, waterIntake, waterGoal, onWaterUpdate }: WaterTrackerModalProps) {
  const [localIntake, setLocalIntake] = useState(waterIntake);
  const hasFiredConfetti = useRef(false);
  
  useEffect(() => {
    if (isOpen) {
      setLocalIntake(waterIntake);
      hasFiredConfetti.current = waterIntake >= waterGoal;
    }
  }, [waterIntake, waterGoal, isOpen]);

  const debouncedUpdate = useCallback(debounce(onWaterUpdate, 500), [onWaterUpdate]);

  const handleIntakeChange = (newIntake: number) => {
    const clampedIntake = Math.max(0, newIntake);
    setLocalIntake(clampedIntake);
    debouncedUpdate(clampedIntake);

    // Trigger confetti when goal is met
    if (clampedIntake >= waterGoal && !hasFiredConfetti.current) {
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            zIndex: 9999,
        });
        hasFiredConfetti.current = true;
    } else if (clampedIntake < waterGoal) {
        hasFiredConfetti.current = false;
    }
  };

  const handleAddWater = () => handleIntakeChange(localIntake + CUP_SIZE);
  const handleRemoveWater = () => handleIntakeChange(localIntake - CUP_SIZE);

  const progress = waterGoal > 0 ? (localIntake / waterGoal) * 100 : 0;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm p-0">
        <DialogHeader className='text-center'>
          <DialogTitle className="text-2xl font-bold">Registrar Água</DialogTitle>
          <DialogDescription>
            Acompanhe sua meta diária de hidratação. Cada toque adiciona 250ml.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center text-center py-8 gap-6 px-6">
            <WaterBottle progress={progress} />

            <p className="text-4xl font-bold text-foreground">
              {(localIntake / 1000).toFixed(2)}
              <span className="text-2xl text-muted-foreground">L</span>
            </p>
            <p className="text-sm text-muted-foreground -mt-4">Meta: {(waterGoal / 1000).toFixed(2)}L</p>
            
            <div className="flex items-center justify-center gap-4 mt-4">
              <Button variant="outline" size="icon" className="h-12 w-12 rounded-full" onClick={handleRemoveWater} disabled={localIntake <= 0}>
                  <Minus className="h-6 w-6" />
              </Button>
              <Button variant="outline" size="icon" className="h-12 w-12 rounded-full" onClick={handleAddWater}>
                  <Plus className="h-6 w-6" />
              </Button>
            </div>
        </div>

        <DialogFooter>
          <Button type="button" onClick={() => onOpenChange(false)} className='w-full sm:w-auto'>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
