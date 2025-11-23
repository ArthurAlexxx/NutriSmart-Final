
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Loader2, Utensils, Flame, Beef, Wheat, Donut, CheckSquare, Clock, Users, Soup, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Recipe } from '@/lib/ai-schemas';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { Button } from './ui/button';

interface RecipeDisplayProps {
  recipe: Recipe | null;
  isGenerating: boolean;
  isChatMode?: boolean;
}

const InfoBadge = ({ icon: Icon, text }: { icon: React.ElementType, text: string }) => (
    <Badge variant="outline" className="flex items-center gap-2 py-1.5 px-3 border-primary/20 bg-primary/5 text-primary text-sm">
        <Icon className="h-4 w-4" />
        <span className="font-medium">{text}</span>
    </Badge>
);

const NutrientItem = ({ value, label, icon: Icon, colorClass }: { value: string; label: string; icon: React.ElementType; colorClass?: string }) => (
  <div className="flex flex-col items-center justify-center text-center gap-1 rounded-xl p-3 bg-secondary/30 border">
    <Icon className={cn('h-7 w-7 mb-1', colorClass || 'text-muted-foreground')} />
    <p className={cn('text-xl font-bold', colorClass || 'text-foreground')}>{value}</p>
    <p className="text-xs text-muted-foreground font-medium">{label}</p>
  </div>
);


export default function RecipeDisplay({ recipe, isGenerating, isChatMode = false }: RecipeDisplayProps) {
  const [isInstructionsOpen, setIsInstructionsOpen] = useState(false);
  const [isRecipeOpen, setIsRecipeOpen] = useState(isChatMode); // Start open in chat, closed otherwise

  if (isGenerating) {
    return (
      <Card className="shadow-lg rounded-3xl min-h-[400px] flex flex-col items-center justify-center text-center p-8 animate-fade-in border-dashed">
        <Loader2 className="h-12 w-12 text-primary animate-spin mb-6" />
        <CardTitle className="text-2xl">Seu Chef está pensando...</CardTitle>
        <CardDescription className="mt-2 max-w-sm">Criando uma receita incrível especialmente para você. Isso pode levar alguns segundos.</CardDescription>
      </Card>
    );
  }

  if (!recipe) {
    return (
        <Card className="shadow-sm rounded-3xl min-h-[400px] flex flex-col items-center justify-center text-center p-8 border-dashed border-2 bg-secondary/30">
            <Soup className="h-16 w-16 text-muted-foreground/50 mb-6" />
            <CardTitle className="text-2xl">Aguardando sua ideia</CardTitle>
            <CardDescription className="mt-2 max-w-xs">Preencha o formulário ao lado para que nosso Chef Virtual crie uma receita para você.</CardDescription>
        </Card>
    );
  }
  
  if (!recipe) return null;


  const headerContent = (
     <CardHeader className={cn(isChatMode ? 'p-4' : 'p-6')}>
        <CardTitle className="text-2xl md:text-3xl font-bold text-balance">{recipe.title}</CardTitle>
        <CardDescription className="pt-2 text-base">{recipe.description}</CardDescription>
        {!isRecipeOpen && !isChatMode && (
             <div className="pt-4">
                <Button onClick={() => setIsRecipeOpen(true)} className="w-full">
                    Ver Receita Completa
                </Button>
            </div>
        )}
    </CardHeader>
  );

  const mainContent = (
      <>
        <div className={cn("pt-0 space-y-8", isChatMode ? 'p-4' : 'p-6')}>
            <div className="flex flex-wrap items-center gap-3">
                <InfoBadge icon={Clock} text={`${recipe.prepTime} preparo`} />
                <InfoBadge icon={Utensils} text={`${recipe.cookTime} cozimento`} />
                <InfoBadge icon={Users} text={`${recipe.servings} porções`} />
            </div>
            <div className="grid md:grid-cols-2 gap-8">
                <div>
                    <h3 className="text-xl font-semibold mb-4 flex items-center gap-2"><CheckSquare className="h-5 w-5 text-primary" /> Ingredientes</h3>
                    <ul className="list-disc list-inside space-y-2 text-muted-foreground bg-secondary/30 p-4 rounded-lg border">
                        {recipe.ingredients.map((item, index) => <li key={index} className="ml-2">{item}</li>)}
                    </ul>
                </div>
                <div>
                    <h3 className="text-xl font-semibold mb-4 flex items-center gap-2"><Flame className="h-5 w-5 text-primary" /> Nutrientes</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <NutrientItem value={recipe.nutrition.calories} label="Calorias" icon={Flame} colorClass="text-orange-500" />
                        <NutrientItem value={recipe.nutrition.protein} label="Proteínas" icon={Beef} colorClass="text-blue-500" />
                        <NutrientItem value={recipe.nutrition.carbs} label="Carbos" icon={Wheat} colorClass="text-yellow-500" />
                        <NutrientItem value={recipe.nutrition.fat} label="Gorduras" icon={Donut} colorClass="text-pink-500" />
                    </div>
                </div>
            </div>
        </div>
      </>
  );

  const instructionsContent = (
    <div className={cn("space-y-8", isChatMode ? 'px-4 pb-4' : 'px-6 pb-6')}>
      <div>
        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2"><Utensils className="h-5 w-5 text-primary" /> Modo de Preparo</h3>
        <ol className="space-y-4 list-decimal list-outside pl-5">
          {recipe.instructions.map((step, index) => (
            <li key={index} className="pl-2 text-base text-muted-foreground">
              <span className="font-semibold text-foreground">Passo {index + 1}:</span> {step.replace(/^\d+\.\s*/, '')}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );

  return (
    <div className={cn(!isChatMode && "shadow-lg rounded-3xl animate-fade-in border bg-card overflow-hidden")}>
        {headerContent}
        {isRecipeOpen && (
            <Collapsible open={isInstructionsOpen} onOpenChange={setIsInstructionsOpen} className="animate-fade-in">
                <CardContent>
                    {mainContent}
                </CardContent>
                <CollapsibleContent>
                   {instructionsContent}
                </CollapsibleContent>
                <CardFooter className={cn("p-6 pt-0", isChatMode && "p-4 pt-0")}>
                    <CollapsibleTrigger asChild>
                        <Button variant="ghost" className="w-full text-primary hover:text-primary">
                            {isInstructionsOpen ? 'Ocultar Modo de Preparo' : 'Ver Modo de Preparo Completo'}
                            <ChevronDown className={cn("h-4 w-4 ml-2 transition-transform", isInstructionsOpen && "rotate-180")} />
                        </Button>
                    </CollapsibleTrigger>
                </CardFooter>
            </Collapsible>
        )}
    </div>
  )
}
