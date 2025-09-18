"use client"

import { format } from "date-fns"
import { CalendarIcon } from "@radix-ui/react-icons"

import { cn } from "@/lib/utils"
import { BaseButton } from "@/components/ui/shadecn/BaseButton"
import { Calendar } from "./Calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/shadecn/Popover"

interface DatePickerProps {
    date?: Date
    onSelect?: (date: Date | undefined) => void
    placeholder?: string
    className?: string
    disabled?: boolean
}

export function DatePicker({ date, onSelect, placeholder = "Pick a date", className, disabled }: DatePickerProps) {
    return (
        <Popover>
            <PopoverTrigger asChild>
                <BaseButton
                    variant="outline"
                    className={cn(
                        "w-[280px] justify-start text-left font-normal",
                        !date && "text-muted-foreground",
                        className
                    )}
                    disabled={disabled}
                >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : <span>{placeholder}</span>}
                </BaseButton>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={date} onSelect={onSelect} />
            </PopoverContent>
        </Popover>
    )
}