"use client"

import * as React from "react"
import { CalendarIcon } from '@radix-ui/react-icons';
import { cn } from '@/lib/utils.ts';
import { BaseButton } from "@/components/ui/shadecn/BaseButton"
import { Calendar } from "@/components/ui/shadecn/calendar"
import { Label } from "@/components/ui/Label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/shadecn/Popover"
import { format } from "date-fns"


interface DatePickerProps {
  label?: string;
  value?: Date;
  className?: string;
  placeholder?: string;
  onChange?: (value: Date) => void;
}

function DatePicker({ label, value, className, placeholder, onChange }: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const formattedDate = value ? format(value, "dd.MM.yyyy") : placeholder; // Display date in a user-readable format

  return (
    <div className="relative grid w-full items-center gap-1.5">
      {label && <Label htmlFor="date">{label}</Label>}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <BaseButton
            variant="outline"
            id="date"
            className={cn(
              'w-full h-11 px-4 text-sm text-left justify-between border-gray-300 text-gray-800',
              className
            )}
          >
            {formattedDate}
            <CalendarIcon />
          </BaseButton>
        </PopoverTrigger>
        <PopoverContent className="w-auto overflow-hidden p-0" align="start">
          <Calendar
            mode="single"
            selected={value}
            defaultMonth={value}
            captionLayout="dropdown"
            onSelect={(selectedDate) => {
              if (!selectedDate) return;
              //setDate(selectedDate);
              onChange?.(selectedDate);
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}


export default DatePicker;
