'use client';

import { format } from 'date-fns';
import { de, enUS, uk } from 'date-fns/locale';
import { CalendarIcon } from '@radix-ui/react-icons';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/utils';
import { BaseButton } from '@/components/ui/shadecn/BaseButton';
import { Calendar } from './Calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/shadecn/Popover';

interface DatePickerProps {
    date?: Date;
    onSelect?: (date: Date | undefined) => void;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
}

export function DatePicker({ date, onSelect, placeholder, className, disabled }: DatePickerProps) {
    const { t, i18n } = useTranslation();
    const defaultPlaceholder = placeholder || t('datePicker.selectDate');

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
        <Popover>
            <PopoverTrigger asChild>
                <BaseButton
                    variant="outline"
                    className={cn('w-[280px] justify-start text-left font-normal', !date && 'text-muted-foreground', className)}
                    disabled={disabled}
                >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, 'PPP', { locale: getDateLocale() }) : <span>{defaultPlaceholder}</span>}
                </BaseButton>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={date} onSelect={onSelect} />
            </PopoverContent>
        </Popover>
    );
}
