// src/components/live-analysis-view.tsx
'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { analyzeFoodInFrameAction } from '@/app/actions/ai-actions';
import { saveAnalyzedMealAction } from '@/app/actions/meal-actions';
import type { FrameAnalysisOutput } from '@/lib/ai-schemas';
import { Button } from './ui/button';
import { CameraOff, Zap, Flame, Rocket, Donut, Save, AlertTriangle } from 'lucide-react';
import { FaBreadSlice } from 'react-icons/fa';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';


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
  const [lastError, setLastError] = useState<string | null>(null);
  const [isSaveSheetOpen, setIsSaveSheetOpen] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const { user } = useUser();

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
      setLastError(null); // Clear error on success
    } catch (error: any) {
      console.error("Frame analysis failed:", error);
      setLastError(error.message || 'A análise falhou. Tente novamente.');
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


  const handleSaveMeal = async () => {
      if (!user || !selectedMealType || !totals) return;
      
      setIsSaving(true);
      try {
          const result = await saveAnalyzedMealAction({
              userId: user.uid,
              mealType: selectedMealType,
              totals: totals,
              description: ingredients.join(', ') || 'Refeição da câmera',
          });
          if(result.success) {
              toast({ title: 'Sucesso!', description: result.message });
              setIsSaveSheetOpen(false);
              setSelectedMealType('');
          } else {
              throw new Error(result.message);
          }
      } catch (error: any) {
          toast({ title: 'Erro ao Salvar', description: error.message, variant: 'destructive' });
      } finally {
        setIsSaving(false);
      }
  };


  return (
    <>
    <div className="w-full h-full bg-black rounded-2xl relative flex items-center justify-center overflow-hidden">
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
      
       <AnimatePresence>
        {lastError && (
             <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="absolute top-12 left-4 right-4 z-20 p-2 text-xs bg-destructive/80 text-destructive-foreground rounded-lg flex items-center justify-center gap-2"
            >
                <AlertTriangle className="h-4 w-4" />
                <span>Análise falhou. Tente uma imagem mais nítida.</span>
            </motion.div>
        )}
       </AnimatePresence>


       <div className="absolute top-4 right-4 z-20">
         {isAnalyzing && (
            <div className="p-3 bg-background/80 backdrop-blur-md rounded-full flex items-center gap-2 animate-pulse">
                <Zap className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium text-foreground hidden sm:inline">Analisando...</span>
            </div>
        )}
       </div>

        <AnimatePresence>
            {analysisResult && analysisResult.items.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 50, x: '-50%' }}
                    animate={{ opacity: 1, y: 0, x: '-50%' }}
                    exit={{ opacity: 0, y: 50, x: '-50%' }}
                    transition={{ duration: 0.5, ease: 'easeInOut' }}
                    className="absolute bottom-4 landscape:top-1/2 landscape:-translate-y-1/2 landscape:right-4 landscape:left-auto landscape:bottom-auto landscape:w-72 left-1/2 w-[calc(100%-2rem)] z-20 p-4 bg-background/80 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl"
                >
                    <div className="mb-3">
                         <h3 className="font-semibold text-lg text-foreground">Análise do Prato</h3>
                         <p className="text-sm text-muted-foreground line-clamp-2">{ingredients.join(', ')}</p>
                    </div>

                    <div className="grid grid-cols-4 gap-3 mb-4">
                        <NutrientDisplay label="Calorias" value={totals.calories} icon={Flame} color='text-orange-500'/>
                        <NutrientDisplay label="Proteínas" value={totals.protein} icon={Rocket} color='text-blue-500'/>
                        <NutrientDisplay label="Carbos" value={totals.carbs} icon={FaBreadSlice} color='text-yellow-500'/>
                        <NutrientDisplay label="Gorduras" value={totals.fat} icon={Donut} color='text-pink-500'/>
                    </div>
                    <Button onClick={() => setIsSaveSheetOpen(true)} className="w-full">
                        <Save className="mr-2 h-4 w-4" /> Salvar Refeição
                    </Button>
                </motion.div>
            )}
        </AnimatePresence>
    </div>
    
    <Sheet open={isSaveSheetOpen} onOpenChange={setIsSaveSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl">
            <SheetHeader className="text-left">
                <SheetTitle>Salvar Refeição Analisada</SheetTitle>
                 <SheetDescription>Selecione o tipo de refeição para registrar em seu diário.</SheetDescription>
            </SheetHeader>
            <div className="py-4">
                <p className="mb-2 text-sm font-medium">Tipo de refeição</p>
                <Select onValueChange={setSelectedMealType} value={selectedMealType}>
                    <SelectTrigger>
                        <SelectValue placeholder="Escolha o tipo da refeição" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="cafe-da-manha">Café da Manhã</SelectItem>
                        <SelectItem value="almoco">Almoço</SelectItem>
                        <SelectItem value="jantar">Jantar</SelectItem>
                        <SelectItem value="lanche">Lanche</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <SheetFooter>
                <Button onClick={handleSaveMeal} disabled={!selectedMealType || isSaving} className="w-full">
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Confirmar e Salvar
                </Button>
            </SheetFooter>
        </SheetContent>
    </Sheet>
    </>
  );
}
