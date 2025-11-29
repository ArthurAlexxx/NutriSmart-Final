// src/components/live-analysis-view.tsx
'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { analyzeFoodInFrameAction } from '@/app/actions/ai-actions';
import type { FrameAnalysisOutput } from '@/lib/ai-schemas';
import { Button } from './ui/button';
import { CameraOff, Zap, Flame, Rocket, Donut } from 'lucide-react';
import { FaBreadSlice } from 'react-icons/fa';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';


interface Totals {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
}

const NutrientDisplay = ({ label, value, icon: Icon, color }: { label: string, value: number, icon: React.ElementType, color: string }) => (
    <div className='flex flex-col items-center justify-center gap-1 text-center p-2 rounded-lg bg-background/50'>
        <div className='flex items-center gap-1.5'>
            <Icon className={cn('h-5 w-5', color)} />
        </div>
        <div>
            <span className='font-bold text-foreground text-lg'>{value.toFixed(0)}</span>
        </div>
         <span className='text-xs font-semibold text-muted-foreground'>{label}</span>
    </div>
);


export default function LiveAnalysisView() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<FrameAnalysisOutput | null>(null);
  const { toast } = useToast();

  const getCameraPermission = useCallback(async () => {
    if (hasCameraPermission) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setHasCameraPermission(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      setHasCameraPermission(false);
      toast({
        variant: 'destructive',
        title: 'Câmera não permitida',
        description: 'Por favor, autorize o acesso à câmera para usar esta funcionalidade.',
      });
    }
  }, [toast, hasCameraPermission]);

  useEffect(() => {
    getCameraPermission();
  }, [getCameraPermission]);

  const captureAndAnalyze = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !hasCameraPermission) return;
    setIsAnalyzing(true);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    context?.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);

    const frameDataUri = canvas.toDataURL('image/jpeg', 0.7);

    try {
      const result = await analyzeFoodInFrameAction({ frameDataUri });
      setAnalysisResult(result);
    } catch (error: any) {
      console.error("Frame analysis failed:", error);
      // Don't toast on every error to avoid spamming the user
    } finally {
      setIsAnalyzing(false);
    }
  }, [hasCameraPermission]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (videoRef.current && !isAnalyzing && hasCameraPermission) {
        captureAndAnalyze();
      }
    }, 2000); // Analyze every 2 seconds

    return () => clearInterval(interval);
  }, [isAnalyzing, hasCameraPermission, captureAndAnalyze]);

  const { totals, ingredients } = useMemo(() => {
    if (!analysisResult) {
      return { totals: { calories: 0, protein: 0, carbs: 0, fat: 0 }, ingredients: [] };
    }

    const newTotals: Totals = analysisResult.items.reduce(
      (acc, item) => {
        acc.calories += item.calorias;
        acc.protein += item.proteinas;
        acc.carbs += item.carboidratos;
        acc.fat += item.gorduras;
        return acc;
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );

    const ingredientList = analysisResult.items.map(item => item.alimento);

    return { totals: newTotals, ingredients: ingredientList };
  }, [analysisResult]);


  return (
    <div className="w-full h-full bg-black rounded-2xl relative flex items-center justify-center">
      <video ref={videoRef} className="w-full h-full object-cover rounded-2xl" autoPlay muted playsInline />
      <canvas ref={canvasRef} className="hidden" />

      {hasCameraPermission === false && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white p-8 text-center z-20">
          <CameraOff className="h-16 w-16 text-destructive mb-4" />
          <h2 className="text-2xl font-bold mb-2">Acesso à Câmera Necessário</h2>
          <p className="text-muted-foreground mb-6">Você precisa permitir o acesso à câmera para usar a análise em tempo real.</p>
          <Button onClick={getCameraPermission}>Tentar Novamente</Button>
        </div>
      )}

      <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
        <span className="font-mono text-sm font-bold text-white">LIVE</span>
      </div>

       <div className="absolute top-4 right-4 z-20">
         {isAnalyzing && (
            <div className="p-2 bg-primary/20 rounded-full animate-pulse">
                <Zap className="h-5 w-5 text-primary" />
            </div>
        )}
       </div>

        <AnimatePresence>
            {analysisResult && analysisResult.items.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 50 }}
                    transition={{ duration: 0.5, ease: 'easeInOut' }}
                    className="absolute bottom-4 left-4 right-4 z-20 p-4 bg-background/80 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl"
                >
                    <div className="mb-3">
                         <h3 className="font-semibold text-lg text-foreground">Análise do Prato</h3>
                         <p className="text-sm text-muted-foreground">{ingredients.join(', ')}</p>
                    </div>

                    <div className="grid grid-cols-4 gap-3">
                        <NutrientDisplay label="Calorias" value={totals.calories} icon={Flame} color='text-orange-500'/>
                        <NutrientDisplay label="Proteínas" value={totals.protein} icon={Rocket} color='text-blue-500'/>
                        <NutrientDisplay label="Carbos" value={totals.carbs} icon={FaBreadSlice} color='text-yellow-500'/>
                        <NutrientDisplay label="Gorduras" value={totals.fat} icon={Donut} color='text-pink-500'/>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    </div>
  );
}
