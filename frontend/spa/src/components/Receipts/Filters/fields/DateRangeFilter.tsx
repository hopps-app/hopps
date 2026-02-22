import { CalendarIcon } from '@radix-ui/react-icons';
import { format } from 'date-fns';
import { de, enUS, uk } from 'date-fns/locale';
import { X } from 'lucide-react';
import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { ReceiptFilterField } from '@/components/Receipts/Filters/ReceiptFilterField';
import { Calendar } from '@/components/ui/shadecn/Calendar';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/shadecn/Popover';
import { cn } from '@/lib/utils';

type DateRangeFilterProps = {
    filters: {
        startDate?: string | null;
        endDate?: string | null;
    };
    onChange: (key: 'startDate' | 'endDate', value: string | null) => void;
    label?: string;
};

const triggerStyles = cn(
    'flex items-center h-10 justify-between text-sm font-normal',
    'rounded-xl border border-[#d1d5db] bg-white px-3',
    'hover:border-[var(--purple-500)] hover:text-[var(--purple-500)] outline-none transition-colors',
    'focus-visible:border-[var(--purple-500)]',
    'data-[state=open]:border-[var(--purple-500)]'
);

export const DateRangeFilter = ({ filters, onChange, label }: DateRangeFilterProps) => {
    const { t, i18n } = useTranslation();

    const [openStart, setOpenStart] = useState(false);
    const [openEnd, setOpenEnd] = useState(false);

    const getDateLocale = useCallback(() => {
        switch (i18n.language) {
            case 'de':
                return de;
            case 'uk':
                return uk;
            default:
                return enUS;
        }
    }, [i18n.language]);

    const handleSelect = useCallback(
        (type: 'startDate' | 'endDate', date: Date | undefined) => {
            if (!date) return;

            onChange(type, format(date, 'yyyy-MM-dd'));
            if (type === 'startDate') {
                setOpenStart(false);
            } else {
                setOpenEnd(false);
            }
        },
        [onChange]
    );

    const formattedStart = filters.startDate ? format(new Date(filters.startDate), 'P', { locale: getDateLocale() }) : t('receipts.filters.startDate');
    const formattedEnd = filters.endDate ? format(new Date(filters.endDate), 'P', { locale: getDateLocale() }) : t('receipts.filters.endDate');

    return (
        <ReceiptFilterField label={label}>
            <div className="flex items-center gap-2 w-full">
                <div className="flex items-center flex-1 min-w-0">
                    <Popover open={openStart} onOpenChange={setOpenStart}>
                        <PopoverTrigger asChild>
                            <button
                                type="button"
                                className={cn(triggerStyles, 'w-full', !filters.startDate && 'text-[#666]', filters.startDate && 'rounded-r-none border-r-0')}
                            >
                                <span className="truncate">{formattedStart}</span>
                                <CalendarIcon className="ml-2 h-4 w-4 shrink-0 text-[#666]" />
                            </button>
                        </PopoverTrigger>
                        <PopoverContent align="start" side="bottom" sideOffset={4} className="p-0 bg-white rounded-xl border border-[#d1d5db] shadow-lg w-auto">
                            <Calendar
                                mode="single"
                                captionLayout="dropdown"
                                startMonth={new Date(1975, 0)}
                                endMonth={new Date(2030, 11)}
                                selected={filters.startDate ? new Date(filters.startDate) : undefined}
                                onSelect={(date) => handleSelect('startDate', date)}
                                disabled={filters.endDate ? { after: new Date(filters.endDate) } : undefined}
                            />
                        </PopoverContent>
                    </Popover>
                    {filters.startDate && (
                        <button
                            type="button"
                            onClick={() => onChange('startDate', null)}
                            className="flex items-center h-10 px-2 border border-l-0 border-[#d1d5db] bg-white rounded-r-xl transition-colors"
                        >
                            <X className="h-3.5 w-3.5 text-[var(--grey-500)]" />
                        </button>
                    )}
                </div>

                <span className="text-sm text-[#666] shrink-0">&ndash;</span>

                <div className="flex items-center flex-1 min-w-0">
                    <Popover open={openEnd} onOpenChange={setOpenEnd}>
                        <PopoverTrigger asChild>
                            <button
                                type="button"
                                className={cn(triggerStyles, 'w-full', !filters.endDate && 'text-[#666]', filters.endDate && 'rounded-r-none border-r-0')}
                            >
                                <span className="truncate">{formattedEnd}</span>
                                <CalendarIcon className="ml-2 h-4 w-4 shrink-0 text-[#666]" />
                            </button>
                        </PopoverTrigger>
                        <PopoverContent align="start" side="bottom" sideOffset={4} className="p-0 bg-white rounded-xl border border-[#d1d5db] shadow-lg w-auto">
                            <Calendar
                                mode="single"
                                captionLayout="dropdown"
                                startMonth={new Date(1975, 0)}
                                endMonth={new Date(2030, 11)}
                                selected={filters.endDate ? new Date(filters.endDate) : undefined}
                                onSelect={(date) => handleSelect('endDate', date)}
                                disabled={filters.startDate ? { before: new Date(filters.startDate) } : undefined}
                            />
                        </PopoverContent>
                    </Popover>
                    {filters.endDate && (
                        <button
                            type="button"
                            onClick={() => onChange('endDate', null)}
                            className="flex items-center h-10 px-2 border border-l-0 border-[#d1d5db] bg-white rounded-r-xl transition-colors"
                        >
                            <X className="h-3.5 w-3.5 text-[var(--grey-500)]" />
                        </button>
                    )}
                </div>
            </div>
        </ReceiptFilterField>
    );
};
