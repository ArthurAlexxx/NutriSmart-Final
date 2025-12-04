// src/components/consumed-foods-list.tsx
import type { MealEntry } from '@/types/meal';
import { CalendarOff, Pencil, Search, Trash2, Filter, Utensils, Flame, Rocket, Donut, X } from 'lucide-react';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import React, { useState, useMemo } from 'react';
import { FaBreadSlice } from 'react-icons/fa';
import { cn } from '@/lib/utils';
import { Input } from './ui/input';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { getMealTime } from '@/lib/date-utils';
import { Separator } from './ui/separator';
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Utensils as UtensilsIcon } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';

interface ConsumedFoodsListProps {
  mealEntries: MealEntry[];
  onMealDeleted: (entryId: string) => void;
  onMealEdit: (mealEntry: MealEntry) => void;
}

const mealTypeOptions = {
    'cafe-da-manha': 'Café da Manhã',
    'almoco': 'Almoço',
    'jantar': 'Jantar',
    'lanche': 'Lanche'
};

const getMealTypeName = (type: string) => {
    return mealTypeOptions[type as keyof typeof mealTypeOptions] || 'Refeição';
}

const NutrientDisplay = ({ label, value, unit, icon: Icon, color }: { label: string, value: number, unit: string, icon: React.ElementType, color: string }) => (
    <div className='flex flex-col items-center justify-center gap-1 text-center p-2 rounded-lg bg-secondary/30'>
        <div className='flex items-center gap-1.5'>
            <Icon className={cn('h-4 w-4', color)} />
            <span className='text-xs font-semibold text-muted-foreground'>{label}</span>
        </div>
        <div>
            <span className='font-bold text-foreground text-lg'>{value.toFixed(0)}</span>
            <span className='text-xs text-muted-foreground ml-1'>{unit}</span>
        </div>
    </div>
);


export default function ConsumedFoodsList({ mealEntries, onMealDeleted, onMealEdit }: ConsumedFoodsListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<Record<string, boolean>>({
    'cafe-da-manha': true,
    'almoco': true,
    'jantar': true,
    'lanche': true,
  });

  const handleCategoryChange = (category: string) => {
    setSelectedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };
  
  const filteredEntries = useMemo(() => {
    const activeCategories = Object.entries(selectedCategories)
      .filter(([, isSelected]) => isSelected)
      .map(([category]) => category);

    return mealEntries.filter(entry => {
      const searchMatch = searchTerm === '' || 
                          entry.mealData.alimentos.some(food => 
                            food.name.toLowerCase().includes(searchTerm.toLowerCase())
                          );
      const categoryMatch = activeCategories.includes(entry.mealType);
      return searchMatch && categoryMatch;
    }).sort((a, b) => (a.createdAt?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || 0));
  }, [mealEntries, searchTerm, selectedCategories]);

  return (
    <>
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
        <div className="relative w-full sm:flex-1 sm:max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar em suas refeições..."
              className="w-full rounded-lg bg-background pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-1 w-full sm:w-auto">
                <Filter className="h-3.5 w-3.5" />
                <span className="whitespace-nowrap">
                    Categoria
                </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Filtrar por tipo</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {Object.entries(mealTypeOptions).map(([key, name]) => (
                <DropdownMenuCheckboxItem
                    key={key}
                    checked={selectedCategories[key]}
                    onCheckedChange={() => handleCategoryChange(key)}
                >
                    {name}
                </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      <ScrollArea className="max-h-[600px] pr-4">
        <div className='space-y-4'>
            {filteredEntries.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-center rounded-lg border-2 border-dashed">
                        <CalendarOff className="h-10 w-10 text-muted-foreground mb-4" />
                        <p className="text-base font-medium text-muted-foreground">Nenhuma refeição encontrada.</p>
                        <p className="text-sm text-muted-foreground mt-1">{searchTerm ? "Tente uma busca diferente ou limpe os filtros." : "Use o botão \"Adicionar Refeição\" para começar a registrar."}</p>
                    </div>
            ) : (
                filteredEntries.map(entry => (
                    <div key={entry.id} className="bg-background p-4 rounded-xl shadow-sm transition-all hover:shadow-md border animate-fade-in">
                      <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-3">
                            {entry.mealData.imageUrl && (
                                <Avatar className="h-12 w-12 border">
                                    <AvatarImage src={entry.mealData.imageUrl} alt={`Foto de ${getMealTypeName(entry.mealType)}`} />
                                    <AvatarFallback><UtensilsIcon className='h-5 w-5 text-muted-foreground'/></AvatarFallback>
                                </Avatar>
                            )}
                              <div>
                                  <p className="font-bold text-lg text-foreground">{getMealTypeName(entry.mealType)}</p>
                                  <p className="text-sm font-normal text-muted-foreground -mt-1">{getMealTime(entry)}</p>
                              </div>
                          </div>
                          <div className="flex items-center gap-1">
                              <TooltipProvider>
                                  <Tooltip>
                                      <TooltipTrigger asChild>
                                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-blue-500" onClick={() => onMealEdit(entry)}>
                                              <Pencil className="h-4 w-4" />
                                          </Button>
                                      </TooltipTrigger>
                                      <TooltipContent><p>Editar Valores</p></TooltipContent>
                                  </Tooltip>
                              </TooltipProvider>
                              <TooltipProvider>
                                  <Tooltip>
                                      <TooltipTrigger asChild>
                                          <Button
                                              variant="ghost"
                                              size="icon"
                                              onClick={() => onMealDeleted(entry.id)}
                                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                          >
                                              <Trash2 className="h-4 w-4" />
                                          </Button>
                                      </TooltipTrigger>
                                      <TooltipContent><p>Excluir Refeição</p></TooltipContent>
                                  </Tooltip>
                              </TooltipProvider>
                          </div>
                      </div>
                      
                      <div className="mb-4 space-y-3">
                        <p className="text-sm text-muted-foreground">
                            {entry.mealData.alimentos[0].name}
                        </p>
                      </div>

                      <Separator />

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4">
                          <NutrientDisplay label="Calorias" value={entry.mealData.totais.calorias} unit='kcal' icon={Flame} color='text-orange-500'/>
                          <NutrientDisplay label="Proteínas" value={entry.mealData.totais.proteinas} unit='g' icon={Rocket} color='text-blue-500'/>
                          <NutrientDisplay label="Carbos" value={entry.mealData.totais.carboidratos} unit='g' icon={FaBreadSlice} color='text-yellow-500' />
                          <NutrientDisplay label="Gorduras" value={entry.mealData.totais.gorduras} unit='g' icon={Donut} color='text-pink-500'/>
                      </div>
                  </div>
                ))
            )}
        </div>
      </ScrollArea>
    </>
  );
}
