'use client';

import { format } from 'date-fns';
import { de, enUS, uk } from 'date-fns/locale';
import { CalendarIcon } from '@radix-ui/react-icons';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import * as _ from 'lodash';

import { cn } from '@/lib/utils';
import { Calendar } from './calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/shadecn/Popover';
import { Label } from '@/components/ui/Label';

interface DatePickerProps {
    date?: Date;
    onSelect?: (date: Date | undefined) => void;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
    label?: string;
    error?: string;
}

export function DatePicker({ date, onSelect, placeholder, className, disabled, label, error }: DatePickerProps) {
    const { t, i18n } = useTranslation();
    const defaultPlaceholder = placeholder || t('datePicker.selectDate');
    const [id] = useState(_.uniqueId('date-picker-'));

    // Get the appropriate date-fns locale based on the current language
    const getDateLocale = () => {
        switch (i18n.language) {
            case 'de':
                return de;
            case 'uk':
                return uk;
            default:
                return enUS;
        }
    };

    return (
        <div className="relative grid w-full items-center gap-1.5">
            {label && <Label htmlFor={id}>{label}</Label>}
            <div className="relative flex items-center">
                <Popover>
                    <PopoverTrigger asChild>
                        <button
                            id={id}
                            type="button"
                            disabled={disabled}
                            className={cn(
                                'w-full text-gray-800 text-sm border border-gray-300 px-4 py-3 rounded-md outline-primary bg-primary-foreground',
                                'placeholder:text-muted focus:border-primary transition-colors',
                                'disabled:cursor-not-allowed disabled:opacity-50',
                                'flex items-center justify-start text-left font-normal',
                                !date && 'text-muted-foreground',
                                className
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {date ? format(date, 'PPP', { locale: getDateLocale() }) : <span>{defaultPlaceholder}</span>}
                        </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                        <Calendar mode="single" selected={date} onSelect={onSelect} />
                    </PopoverContent>
                </Popover>
            </div>
            {error && (
                <div className="absolute bottom-0 right-0 bg-destructive text-destructive-foreground text-xs px-4 translate-y-2.5 select-none">
                    {error}
                </div>
            )}
        </div>
    );
}
