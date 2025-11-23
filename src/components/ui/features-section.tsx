

'use client';
import { BrainCircuit, ChefHat, BookCheck, Users, TrendingUp, BookCopy, ArrowRight, Plus, Flame, Rocket, Donut, Lock, Pencil, Target, Utensils, CheckSquare, Clock, Soup, ChevronDown } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from './button';
import Link from 'next/link';
import { useState, useMemo, useEffect } from 'react';
import RecipeDisplay from '../recipe-display';
import { Textarea } from './textarea';
import type { Recipe } from '@/lib/ai-schemas';
import { Badge } from './badge';
import { AnimatePresence, motion } from 'framer-motion';
import { DashboardCharts } from '../dashboard-charts';
import { cn } from '@/lib/utils';
import { FaBreadSlice } from 'react-icons/fa';

const features = [
  {
    id: 'diary',
    icon: BookCheck,
    title: 'Diário Inteligente, Esforço Mínimo',
    description: 'Chega de procurar alimentos em listas intermináveis. Apenas descreva sua refeição e nossa IA calcula tudo para você em segundos.',
  },
  {
    id: 'chef',
    icon: ChefHat,
    title: 'Chef Virtual com o que Você Tem na Geladeira',
    description: 'Sem inspiração? Diga ao nosso Chef IA os ingredientes que você tem e receba receitas incríveis, com passo a passo e informações nutricionais.',
  },
  {
    id: 'plan',
    icon: BookCopy,
    title: 'Plano Alimentar que se Adapta a Você',
    description: 'Nossa IA elabora um plano de refeições completo para o seu dia, com base em suas metas, distribuindo os nutrientes de forma inteligente para você seguir e evoluir.',
  },
  {
    id: 'analysis',
    icon: TrendingUp,
    title: 'Seu Progresso, de Forma Clara e Visual',
    description: 'Transformamos seus registros diários em gráficos intuitivos que mostram sua evolução de peso, consumo de calorias e hidratação. Entenda seus padrões e mantenha-se motivado.',
  },
];

const exampleRecipe: Recipe = {
    title: 'Frango Grelhado com Legumes Assados',
    description: 'Uma refeição saudável, rápida e deliciosa, perfeita para um almoço ou jantar leve durante a semana.',
    prepTime: '10 min',
    cookTime: '20 min',
    servings: '2',
    ingredients: [
        '2 filés de peito de frango (cerca de 150g cada)',
        '1 abobrinha média, em rodelas',
        '1 pimentão vermelho, em tiras',
        '1 cebola roxa, em pétalas',
        '2 colheres de sopa de azeite de oliva',
        'Sal, pimenta do reino e ervas a gosto (orégano, alecrim)',
    ],
    instructions: [
        'Tempere os filés de frango com sal, pimenta e uma colher de azeite.',
        'Em uma tigela, misture os legumes com o restante do azeite, sal e ervas.',
        'Aqueça uma frigideira ou grill e grelhe o frango por 5-7 minutos de cada lado, ou até estar cozido.',
        'Enquanto o frango grelha, asse os legumes em uma airfryer ou forno a 200°C por cerca de 15 minutos.',
        'Sirva o frango com os legumes assados ao lado.',
    ],
    nutrition: {
        calories: '450',
        protein: '40g',
        carbs: '15g',
        fat: '25g',
    },
};

const AnimatedText = ({ text, onComplete }: { text: string; onComplete?: () => void; }) => {
    const [displayedText, setDisplayedText] = useState('');

    useEffect(() => {
        setDisplayedText('');
        let i = 0;
        const intervalId = setInterval(() => {
            if (i < text.length) {
                setDisplayedText(text.slice(0, i + 1));
                i++;
            } else {
                clearInterval(intervalId);
                if (onComplete) onComplete();
            }
        }, 50); // Typing speed
        return () => clearInterval(intervalId);
    }, [text, onComplete]);

    return <span className="font-semibold text-lg min-h-[28px]">{displayedText}</span>;
};


const exampleAnalysisData = [
  { day: 'Seg', calories: 2100 },
  { day: 'Ter', calories: 2300 },
  { day: 'Qua', calories: 2200 },
  { day: 'Qui', calories: 2400 },
  { day: 'Sex', calories: 2350 },
  { day: 'Sáb', calories: 2600 },
  { day: 'Dom', calories: 2500 },
];

const diaryExamples = [
  {
    id: 'salmon',
    foods: '150g de Salmão Grelhado e 200g de Brócolis no vapor',
    totals: { calorias: 377, proteinas: 34, carboidratos: 15, gorduras: 20 },
    totalsDelay: 2.5
  },
  {
    id: 'chicken',
    foods: '150g de Frango Grelhado e 150g de Batata Doce',
    totals: { calorias: 420, proteinas: 40, carboidratos: 30, gorduras: 15 },
    totalsDelay: 2.5
  },
];

const NutrientDisplay = ({ label, value, icon: Icon, color }: { label: string; value: number; icon: React.ElementType; color: string }) => (
    <div className='flex flex-col items-center justify-center gap-1 text-center p-2 rounded-lg bg-background border'>
        <div className='flex items-center gap-1.5'>
            <Icon className={cn('h-4 w-4', color)} />
            <span className='text-xs font-semibold text-muted-foreground'>{label}</span>
        </div>
        <div>
            <span className='font-bold text-foreground text-lg'>{value.toFixed(0)}</span>
        </div>
    </div>
);


const FeatureDemo = ({ featureId }: { featureId: string }) => {
    const [showChefResult, setShowChefResult] = useState(false);
    const [diaryIndex, setDiaryIndex] = useState(0);
    const [showDiaryTotals, setShowDiaryTotals] = useState(false);
    
    // State for Chef animation
    const [chefAnimatedText, setChefAnimatedText] = useState('');
    const [showRecipeCard, setShowRecipeCard] = useState(false);

    const currentDiaryExample = diaryExamples[diaryIndex];
    
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (featureId === 'chef') {
            setShowRecipeCard(false);
            setChefAnimatedText('');
            const fullText = 'frango, brócolis e arroz...';
            const firstPart = 'frango...';
            
            // Start typing first part
            setChefAnimatedText(firstPart);
            // After first part is "typed", show the card
            const cardTimer = setTimeout(() => {
                setShowRecipeCard(true);
                 // Then continue typing the rest
                const restTimer = setTimeout(() => {
                    setChefAnimatedText(fullText);
                }, 500); // Small delay before typing the rest
                 return () => clearTimeout(restTimer);
            }, firstPart.length * 50 + 500); // 50ms per char + 500ms delay
            
            return () => clearTimeout(cardTimer);
        }
        if (featureId === 'diary') {
            const runLoop = () => {
                setShowDiaryTotals(false);
                setDiaryIndex(prev => (prev + 1) % diaryExamples.length);
            }
            interval = setInterval(runLoop, 7000); // Change every 7 seconds
            
            return () => {
                clearInterval(interval);
            };
        }

    }, [featureId]);

     useEffect(() => {
        if (featureId === 'diary') {
            setShowDiaryTotals(false); // Reset totals visibility when example changes
            const timer = setTimeout(() => {
                setShowDiaryTotals(true);
            }, currentDiaryExample.foods.length * 50 + 500); // Wait for typing animation to finish
            return () => clearTimeout(timer);
        }
    }, [featureId, currentDiaryExample]);
    
    switch (featureId) {
        case 'diary':
            return (
                 <Card className="shadow-lg shadow-primary/10 w-full h-[430px]">
                    <CardHeader>
                        <CardTitle>Adicionar Refeição</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="p-4 border rounded-lg bg-secondary/30">
                            <p className="text-sm font-medium text-muted-foreground">O que você comeu?</p>
                            <AnimatedText
                                key={currentDiaryExample.id}
                                text={currentDiaryExample.foods}
                            />
                        </div>
                        
                        <div className="min-h-[120px]">
                            <AnimatePresence>
                            {showDiaryTotals && (
                                <motion.div
                                    key={`${currentDiaryExample.id}-totals`}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0, transition: { duration: 0.5 } }}
                                    exit={{ opacity: 0 }}
                                    className="p-4 border rounded-lg bg-primary/5"
                                >
                                    <h4 className='font-semibold mb-2'>Análise da IA:</h4>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                        <NutrientDisplay label="Calorias" value={currentDiaryExample.totals.calorias} icon={Flame} color='text-orange-500'/>
                                        <NutrientDisplay label="Proteínas" value={currentDiaryExample.totals.proteinas} icon={Rocket} color='text-blue-500'/>
                                        <NutrientDisplay label="Carbos" value={currentDiaryExample.totals.carboidratos} icon={FaBreadSlice} color='text-yellow-500'/>
                                        <NutrientDisplay label="Gorduras" value={currentDiaryExample.totals.gorduras} icon={Donut} color='text-pink-500'/>
                                    </div>
                                </motion.div>
                            )}
                            </AnimatePresence>
                        </div>
                    </CardContent>
                </Card>
            );
        case 'chef':
            return (
                <Card className="shadow-lg shadow-primary/10 w-full overflow-hidden">
                    <CardContent className="p-4 space-y-4">
                        <div className="p-4 border rounded-2xl bg-card">
                             <p className="text-sm text-muted-foreground">Tenho em casa...</p>
                             <AnimatedText text={chefAnimatedText} />
                        </div>
                        <RecipeDisplay recipe={showRecipeCard ? exampleRecipe : null} isGenerating={!showRecipeCard} isChatMode={true} />
                    </CardContent>
                </Card>
            );
        case 'plan':
            return (
                <Card className="shadow-lg shadow-primary/10 w-full">
                    <CardHeader>
                        <div className='flex items-center justify-between'>
                            <CardTitle className='flex items-center gap-2'><Target className='h-5 w-5 text-primary' /> Plano de Emagrecimento</CardTitle>
                            <Badge variant="default">IA</Badge>
                        </div>
                        <CardDescription>Meta: 1800 kcal / 158g Proteína</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div className="p-3 border rounded-lg bg-secondary/30">
                            <p className="font-semibold text-sm">Café da Manhã (08:00)</p>
                            <p className="text-sm text-muted-foreground">Ovos mexidos com espinafre e uma fatia de pão integral.</p>
                        </div>
                        <div className="p-3 border rounded-lg bg-secondary/30">
                            <p className="font-semibold text-sm">Almoço (12:30)</p>
                            <p className="text-sm text-muted-foreground">150g de salmão grelhado, 100g de quinoa e salada verde.</p>
                        </div>
                        <div className="p-3 border rounded-lg bg-secondary/30">
                            <p className="font-semibold text-sm">Jantar (19:00)</p>
                            <p className="text-sm text-muted-foreground">Sopa de lentilhas com legumes e uma colher de iogurte.</p>
                        </div>
                    </CardContent>
                </Card>
            );
        case 'analysis':
             return (
                 <Card className="shadow-lg shadow-primary/10 w-full">
                    <CardHeader>
                        <CardTitle className='flex items-center gap-2'><TrendingUp className='h-5 w-5 text-primary'/> Consumo de Calorias</CardTitle>
                        <CardDescription>Sua ingestão de calorias na última semana.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <DashboardCharts chartType="calories" data={exampleAnalysisData} />
                    </CardContent>
                 </Card>
            );
        default:
            return null;
    }
}

const FeatureShowcase = ({ feature, index }: { feature: typeof features[0], index: number }) => {
    const isEven = index % 2 === 0;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center py-12">
            <div className={cn("space-y-4 text-center md:text-left", isEven ? "md:order-1" : "md:order-2")}>
                <div className="inline-flex items-center justify-center bg-primary/10 text-primary rounded-full p-3 mb-3">
                    <feature.icon className="h-7 w-7" />
                </div>
                <h3 className="text-2xl font-bold font-heading">{feature.title}</h3>
                <p className="text-muted-foreground text-lg">
                    {feature.description}
                </p>
                {(feature.id === 'plan' || feature.id === 'analysis' || feature.id === 'chef') && (
                    <Button asChild size="lg" variant="ghost" className='text-primary hover:text-primary'>
                        <Link href="/pricing">
                            Ver Planos Premium <ArrowRight className="ml-2 h-5 w-5" />
                        </Link>
                    </Button>
                )}
            </div>
            <div className={cn("flex justify-center", isEven ? "md:order-2" : "md-order-1")}>
                 <FeatureDemo featureId={feature.id} />
            </div>
        </div>
    );
};


export function FeaturesSection() {
  return (
    <section id="features" className="w-full py-20 lg:py-24">
      <div className="container mx-auto">
        <div className="text-center max-w-3xl mx-auto">
          <Badge variant="outline" className="mb-4">Funcionalidades</Badge>
          <h2 className="text-3xl font-bold md:text-4xl font-heading">Tudo que você precisa em um <span className='text-primary'>só lugar</span></h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Esqueça as complicações. Foco nos seus resultados com ferramentas inteligentes.
          </p>
        </div>

        <div className="mt-16 space-y-16">
            {features.map((feature, index) => (
                <FeatureShowcase key={feature.id} feature={feature} index={index} />
            ))}
        </div>
      </div>
    </section>
  );
}
