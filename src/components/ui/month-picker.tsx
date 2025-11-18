"use client"

import * as React from "react"
import { format, addMonths, subMonths } from "date-fns"
import { ptBR } from "date-fns/locale"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

interface MonthPickerProps {
  month: Date;
  setMonth: (date: Date) => void;
}

export function MonthPicker({ month, setMonth }: MonthPickerProps) {
  const handlePrevMonth = () => {
    setMonth(subMonths(month, 1));
  };

  const handleNextMonth = () => {
    const nextMonth = addMonths(month, 1);
    // Prevent navigating to a future month
    if (nextMonth <= new Date()) {
      setMonth(nextMonth);
    }
  };

  return (
    <div className="flex items-center justify-between p-4">
      <Button variant="outline" size="icon" onClick={handlePrevMonth}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <div className="text-lg font-semibold capitalize">
        {format(month, "MMMM yyyy", { locale: ptBR })}
      </div>
      <Button 
        variant="outline" 
        size="icon" 
        onClick={handleNextMonth}
        disabled={addMonths(month, 1) > new Date()}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}
