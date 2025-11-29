// src/components/history-kanban-calendar.tsx
'use client';

import { useState, useEffect } from 'react';
import { format, addDays, subDays, isToday, isEqual, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Card } from './ui/card';

interface HistoryKanbanCalendarProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
}

export default function HistoryKanbanCalendar({ selectedDate, onDateSelect }: HistoryKanbanCalendarProps) {
  const [displayStartDate, setDisplayStartDate] = useState(subDays(startOfDay(new Date()), 3));

  const daysToDisplay = Array.from({ length: 4 }, (_, i) => addDays(displayStartDate, i));

  const handlePrev = () => {
    setDisplayStartDate(subDays(displayStartDate, 4));
  };

  const handleNext = () => {
    const nextDate = addDays(displayStartDate, 4);
    if (startOfDay(nextDate) <= startOfDay(new Date())) {
        setDisplayStartDate(nextDate);
    }
  };
  
  const isNextDisabled = () => {
      const today = startOfDay(new Date());
      return daysToDisplay.some(day => isEqual(startOfDay(day), today) || startOfDay(day) > today);
  }

  return (
    <Card className="shadow-lg rounded-2xl p-4 w-full">
        <div className="flex items-center justify-between">
            <Button variant="outline" size="icon" onClick={handlePrev}>
                <ChevronLeft className="h-5 w-5" />
            </Button>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mx-2 flex-1">
                {daysToDisplay.map((day, index) => {
                    const isSelected = isEqual(startOfDay(day), startOfDay(selectedDate));
                    
                    return (
                        <Button
                            key={index}
                            variant={isSelected ? 'default' : 'outline'}
                            className={cn(
                                "flex flex-col h-20 rounded-lg text-center transition-all duration-200",
                                isToday(day) && !isSelected && "border-primary/50 text-primary"
                            )}
                            onClick={() => onDateSelect(day)}
                            disabled={day > new Date()}
                        >
                            <span className="text-sm capitalize font-normal">
                                {format(day, 'EEE', { locale: ptBR })}
                            </span>
                            <span className="text-3xl font-bold">
                                {format(day, 'dd', { locale: ptBR })}
                            </span>
                            <span className="text-xs capitalize font-normal -mt-1">
                                {format(day, 'MMM', { locale: ptBR })}
                            </span>
                        </Button>
                    )
                })}
            </div>

            <Button 
                variant="outline" 
                size="icon" 
                onClick={handleNext} 
                disabled={isNextDisabled()}
            >
                <ChevronRight className="h-5 w-5" />
            </Button>
        </div>
    </Card>
  );
}
