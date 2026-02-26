import { CheckIcon, ChevronDownIcon } from '@radix-ui/react-icons';
import { X } from 'lucide-react';
import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { ReceiptFilterField } from '@/components/Receipts/Filters/ReceiptFilterField';
import { Command, CommandGroup, CommandItem, CommandList } from '@/components/ui/Command';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/shadecn/Popover';
import { cn } from '@/lib/utils';

const AREA_VALUES = ['IDEELL', 'ZWECKBETRIEB', 'VERMOEGENSVERWALTUNG', 'WIRTSCHAFTLICH'] as const;

type AreaFilterProps = {
    filters: {
        area?: string | null;
    };
    onChange: (key: 'area', value: string | null) => void;
    label?: string;
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
            <div className="flex items-center w-full">
                <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                        <button
                            type="button"
                            aria-haspopup="listbox"
                            aria-expanded={open}
                            className={cn(
                                'flex items-center w-full h-10 justify-between text-sm font-normal',
                                'rounded-xl border border-[#d1d5db] bg-white px-3 text-left',
                                !selectedArea && 'hover:border-[var(--purple-500)] hover:text-[var(--purple-500)]',
                                'outline-none transition-colors',
                                'focus-visible:border-[var(--purple-500)]',
                                'data-[state=open]:border-[var(--purple-500)]',
                                !selectedArea && 'text-[#666]',
                                selectedArea && 'rounded-r-none border-r-0'
                            )}
                        >
                            <span className="truncate">{selectedArea ? selectedArea.label : t('receipts.filters.allAreas')}</span>
                            {!selectedArea && <ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 text-[#666]" />}
                        </button>
                    </PopoverTrigger>

                    <PopoverContent align="start" side="bottom" sideOffset={4} className="w-full p-0">
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
                        className="flex items-center h-10 px-3 border border-l-0 border-[#d1d5db] bg-white rounded-r-xl transition-colors"
                    >
                        <X className="h-3.5 w-3.5 text-[var(--purple-500)]" />
                    </button>
                )}
            </div>
        </ReceiptFilterField>
    );
};

export default AreaFilter;
