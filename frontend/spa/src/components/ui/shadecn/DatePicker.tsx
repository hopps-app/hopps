'use client';

import { CalendarIcon } from '@radix-ui/react-icons';
import { format } from 'date-fns';
import { de, enUS, uk } from 'date-fns/locale';
import * as _ from 'lodash';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Calendar } from './Calendar';

import InputLoader from '@/components/ui/InputLoader';
import { Label } from '@/components/ui/Label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/shadecn/Popover';
import { cn } from '@/lib/utils';

interface DatePickerProps {
    date?: Date;
    onSelect?: (date: Date | undefined) => void;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
    label?: string;
    error?: string;
    loading?: boolean;
}

export function DatePicker({ date, onSelect, placeholder, className, disabled, label, error, loading }: DatePickerProps) {
    const { t, i18n } = useTranslation();
    const defaultPlaceholder = placeholder || t('datePicker.selectDate');
    const [id] = useState(_.uniqueId('date-picker-'));
    const errorId = `${id}-error`;

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
                            aria-invalid={error ? true : undefined}
                            aria-describedby={error ? errorId : undefined}
                            className={cn(
                                'w-full text-gray-800 text-sm border border-[#d1d5db] h-10 rounded-xl outline-none bg-white',
                                'placeholder:text-muted focus-visible:border-[var(--purple-500)] data-[state=open]:border-[var(--purple-500)] transition-colors',
                                'disabled:cursor-not-allowed disabled:opacity-50',
                                'flex items-center justify-between text-left font-normal',
                                !date && 'text-muted-foreground',
                                loading ? 'pl-3 pr-3' : 'px-3',
                                className
                            )}
                        >
                            {loading && (
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10">
                                    <InputLoader />
                                </div>
                            )}
                            {date ? format(date, 'PPP', { locale: getDateLocale() }) : <span>{defaultPlaceholder}</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 shrink-0" />
                        </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                        <Calendar
                            mode="single"
                            captionLayout="dropdown"
                            startMonth={new Date(1975, 0)}
                            endMonth={new Date(2030, 11)}
                            selected={date}
                            onSelect={onSelect}
                        />
                    </PopoverContent>
                </Popover>
            </div>
            {error && (
                <div
                    id={errorId}
                    role="alert"
                    className="absolute bottom-0 right-0 bg-destructive text-destructive-foreground text-xs px-4 translate-y-2.5 select-none"
                >
                    {error}
                </div>
            )}
        </div>
    );
}
