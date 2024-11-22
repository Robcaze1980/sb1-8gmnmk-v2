// src/components/MonthFilter.tsx
import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

interface MonthFilterProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
}

export default function MonthFilter({ currentDate, onDateChange }: MonthFilterProps) {
  const handlePreviousMonth = () => {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1);
    onDateChange(newDate);
  };

  const handleNextMonth = () => {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1);
    onDateChange(newDate);
  };

  return (
    <div className="flex items-center space-x-4">
      <button
        onClick={handlePreviousMonth}
        className="p-2 hover:bg-gray-100 rounded-full"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <span className="text-lg font-medium">
        {format(currentDate, 'MMMM yyyy')}
      </span>
      <button
        onClick={handleNextMonth}
        className="p-2 hover:bg-gray-100 rounded-full"
        disabled={currentDate >= new Date()}
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}
