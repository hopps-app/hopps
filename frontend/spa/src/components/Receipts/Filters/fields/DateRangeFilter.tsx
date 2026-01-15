import { useTranslation } from 'react-i18next';
import { useState, useCallback } from 'react';
import { CalendarIcon } from '@radix-ui/react-icons';
import { format } from 'date-fns';

import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/shadecn/Popover';
import { BaseButton } from '@/components/ui/shadecn/BaseButton';
import { cn } from '@/lib/utils';
import { ReceiptFilterField } from '@/components/Receipts/Filters/ReceiptFilterField';
import { Calendar } from '@/components/ui/shadecn/Calendar';

type DateRangeFilterProps = {
    filters: {
        startDate?: string | null;
        endDate?: string | null;
    };
    onChange: (key: 'startDate' | 'endDate', value: string | null) => void;
    label: string;
};

export const DateRangeFilter = ({ filters, onChange, label }: DateRangeFilterProps) => {
    const { t } = useTranslation();

    const [openStart, setOpenStart] = useState(false);
    const [openEnd, setOpenEnd] = useState(false);

    const handleSelect = useCallback(
        (type: 'startDate' | 'endDate', date: Date | undefined) => {
            if (!date) return;

            onChange(type, date.toISOString());
            if (type === 'startDate') {
                setOpenStart(false);
            } else {
                setOpenEnd(false);
            }
        },
        [onChange]
    );

    const formattedStart = filters.startDate ? format(new Date(filters.startDate), 'dd.MM.yyyy') : t('receipts.filters.startDate');
    const formattedEnd = filters.endDate ? format(new Date(filters.endDate), 'dd.MM.yyyy') : t('receipts.filters.endDate');

    return (
        <ReceiptFilterField label={label}>
            <div className="flex w-full items-center gap-1 2xl:min-w-[350px]">
                <Popover open={openStart} onOpenChange={setOpenStart}>
                    <PopoverTrigger asChild>
                        <BaseButton
                            variant="outline"
                            className={cn(
                                'w-[170px] justify-between text-sm font-normal', // fixed width for both
                                'rounded-[var(--radius-l)] border border-[var(--grey-600)] bg-[var(--grey-white)] px-4 py-2',
                                'focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none',
                                !filters.startDate && 'text-[var(--grey-800)]'
                            )}
                        >
                            <span className="truncate">{formattedStart}</span>
                            <CalendarIcon className="ml-2 h-4 w-4 text-[var(--grey-700)]" />
                        </BaseButton>
                    </PopoverTrigger>
                    <PopoverContent
                        align="start"
                        side="bottom"
                        sideOffset={4}
                        className="p-0 bg-[var(--grey-white)] rounded-[var(--radius-l)] border border-[var(--grey-600)] shadow-sm w-auto"
                    >
                        <Calendar
                            mode="single"
                            captionLayout="dropdown"
                            startMonth={new Date(1975, 0)}
                            endMonth={new Date(2030, 11)}
                            selected={filters.startDate ? new Date(filters.startDate) : undefined}
                            onSelect={(date) => handleSelect('startDate', date)}
                        />
                    </PopoverContent>
                </Popover>

                <Popover open={openEnd} onOpenChange={setOpenEnd}>
                    <PopoverTrigger asChild>
                        <BaseButton
                            variant="outline"
                            className={cn(
                                'w-[170px] justify-between text-sm font-normal', // same width
                                'rounded-[var(--radius-l)] border border-[var(--grey-600)] bg-[var(--grey-white)] px-4 py-2',
                                'focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none',
                                !filters.endDate && 'text-[var(--grey-800)]'
                            )}
                        >
                            <span className="truncate">{formattedEnd}</span>
                            <CalendarIcon className="ml-2 h-4 w-4 text-[var(--grey-700)]" />
                        </BaseButton>
                    </PopoverTrigger>
                    <PopoverContent
                        align="start"
                        side="bottom"
                        sideOffset={4}
                        className="p-0 bg-[var(--grey-white)] rounded-[var(--radius-l)] border border-[var(--grey-600)] shadow-sm w-auto"
                    >
                        <Calendar
                            mode="single"
                            captionLayout="dropdown"
                            startMonth={new Date(1975, 0)}
                            endMonth={new Date(2030, 11)}
                            selected={filters.endDate ? new Date(filters.endDate) : undefined}
                            onSelect={(date) => handleSelect('endDate', date)}
                        />
                    </PopoverContent>
                </Popover>
            </div>
        </ReceiptFilterField>
    );
};
