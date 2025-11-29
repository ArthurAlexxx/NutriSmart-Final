// src/components/live-analysis-view.tsx
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { analyzeFoodInFrameAction } from '@/app/actions/ai-actions';
import type { FrameAnalysisOutput } from '@/lib/ai-schemas';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from './ui/button';
import { CameraOff, Loader2, Zap } from 'lucide-react';

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

  useEffect(() => {
    const interval = setInterval(() => {
      if (videoRef.current && !isAnalyzing && hasCameraPermission) {
        captureAndAnalyze();
      }
    }, 2000); // Analyze every 2 seconds

    return () => clearInterval(interval);
  }, [isAnalyzing, hasCameraPermission]);

  const captureAndAnalyze = async () => {
    if (!videoRef.current || !canvasRef.current) return;
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
  };

  const renderAnalysisBoxes = () => {
    if (!analysisResult || !videoRef.current) return null;
    const { videoWidth, videoHeight } = videoRef.current;
    const scaleX = videoRef.current.clientWidth / videoWidth;
    const scaleY = videoRef.current.clientHeight / videoHeight;

    return analysisResult.items.map((item, index) => {
      const { x, y, width, height } = item.box;
      const boxStyle: React.CSSProperties = {
        position: 'absolute',
        left: `${x * 100}%`,
        top: `${y * 100}%`,
        width: `${width * 100}%`,
        height: `${height * 100}%`,
        border: '2px solid #72A159',
        borderRadius: '8px',
        boxShadow: '0 0 10px rgba(114, 161, 89, 0.5)',
      };

      return (
        <div key={index} style={boxStyle}>
          <div className="absolute -top-8 left-0 bg-primary text-primary-foreground text-xs font-bold p-1 rounded-md whitespace-nowrap">
            {item.alimento} ({item.confianca}%)
          </div>
          <div className="absolute bottom-1 right-1 bg-background/80 backdrop-blur-sm p-1 rounded-md text-xs leading-tight">
            <p>🔥 {item.calorias.toFixed(0)} kcal</p>
            <p>⚡ {item.proteinas.toFixed(0)}g P</p>
          </div>
        </div>
      );
    });
  };

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

      {hasCameraPermission && (
        <div className="absolute inset-0 z-10 pointer-events-none">
          {renderAnalysisBoxes()}
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

    </div>
  );
}
