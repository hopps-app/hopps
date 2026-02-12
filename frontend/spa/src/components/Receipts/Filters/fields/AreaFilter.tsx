import { CheckIcon, ChevronDownIcon } from '@radix-ui/react-icons';
import { X } from 'lucide-react';
import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { ReceiptFilterField } from '@/components/Receipts/Filters/ReceiptFilterField';
import { Command, CommandGroup, CommandItem, CommandList } from '@/components/ui/Command';
import { BaseButton } from '@/components/ui/shadecn/BaseButton';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/shadecn/Popover';
import { cn } from '@/lib/utils';

const AREA_VALUES = ['IDEELL', 'ZWECKBETRIEB', 'VERMOEGENSVERWALTUNG', 'WIRTSCHAFTLICH'] as const;

type AreaFilterProps = {
    filters: {
        area?: string | null;
    };
    onChange: (key: 'area', value: string | null) => void;
    label: string;
};

const AreaFilter = ({ filters, onChange, label }: AreaFilterProps) => {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);

    const areaOptions = useMemo(
        () =>
            AREA_VALUES.map((value) => ({
                value,
                label: t(`receipts.areas.${value.toLowerCase()}`),
            })),
        [t]
    );

    const selectedArea = areaOptions.find((a) => a.value === filters.area);

    const handleSelect = useCallback(
        (value: string) => {
            const newValue = filters.area === value ? null : value;
            onChange('area', newValue);
            setOpen(false);
        },
        [filters.area, onChange]
    );

    return (
        <ReceiptFilterField label={label}>
            <div className="flex items-center w-full max-w-[280px]">
                <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                        <div className={cn('relative flex-1', selectedArea && 'rounded-r-none')}>
                            <BaseButton
                                variant="outline"
                                aria-haspopup="listbox"
                                aria-expanded={open}
                                className={cn(
                                    'w-full h-10 justify-between text-sm font-normal rounded-[var(--radius-l)] border border-[var(--grey-600)] bg-[var(--grey-white)]',
                                    'focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none px-3 text-left',
                                    !selectedArea && 'text-[var(--grey-800)]',
                                    selectedArea && 'rounded-r-none border-r-0'
                                )}
                            >
                                {selectedArea ? selectedArea.label : t('receipts.filters.allAreas')}
                                <ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </BaseButton>
                        </div>
                    </PopoverTrigger>

                    <PopoverContent
                        align="start"
                        side="bottom"
                        sideOffset={4}
                        className={cn(
                            'w-[var(--radix-popover-trigger-width)] p-0 border border-[var(--grey-600)] bg-[var(--grey-white)] rounded-[var(--radius-l)] shadow-sm'
                        )}
                    >
                        <Command shouldFilter={false}>
                            <CommandList>
                                <CommandGroup>
                                    {areaOptions.map((a) => (
                                        <CommandItem key={a.value} onSelect={() => handleSelect(a.value)} className="text-sm">
                                            {a.label}
                                            {filters.area === a.value && <CheckIcon className="ml-auto h-4 w-4 text-[var(--purple-500)]" />}
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
                {selectedArea && (
                    <button
                        type="button"
                        onClick={() => onChange('area', null)}
                        className="flex items-center h-10 px-2 border border-l-0 border-[var(--grey-600)] bg-[var(--grey-white)] rounded-r-[var(--radius-l)] hover:bg-[var(--grey-100)]"
                    >
                        <X className="h-4 w-4 text-[var(--grey-700)] hover:text-[var(--grey-900)]" />
                    </button>
                )}
            </div>
        </ReceiptFilterField>
    );
};

export default AreaFilter;
