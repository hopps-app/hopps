import { CheckIcon, ChevronDownIcon } from '@radix-ui/react-icons';
import { X } from 'lucide-react';
import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { ReceiptFilterField } from '@/components/Receipts/Filters/ReceiptFilterField';
import { Command, CommandGroup, CommandInput, CommandItem, CommandList, CommandEmpty } from '@/components/ui/Command';
import { BaseButton } from '@/components/ui/shadecn/BaseButton';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/shadecn/Popover';
import { useCategories } from '@/hooks/queries';
import { cn } from '@/lib/utils';

type CategoryFilterProps = {
    filters: {
        category?: string | null;
    };
    onChange: (key: 'category', value: string | null) => void;
    label: string;
};

const CategoryFilter = ({ filters, onChange, label }: CategoryFilterProps) => {
    const { t } = useTranslation();
    const { data: categories = [] } = useCategories();
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');

    const categoryNames = useMemo(() => categories.map((c) => c.name), [categories]);

    const filteredCategories = useMemo(() => {
        if (!search) return categoryNames;
        return categoryNames.filter((c) => c.toLowerCase().includes(search.toLowerCase()));
    }, [search, categoryNames]);

    const selectedCategory = filters.category;

    const handleSelect = useCallback(
        (name: string) => {
            const newValue = filters.category === name ? null : name;
            onChange('category', newValue);
            setOpen(false);
        },
        [filters.category, onChange]
    );

    return (
        <ReceiptFilterField label={label}>
            <div className="flex items-center w-full">
                <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                        <BaseButton
                            variant="outline"
                            aria-haspopup="listbox"
                            aria-expanded={open}
                            className={cn(
                                'w-full h-10 justify-between text-sm font-normal',
                                'rounded-xl border border-[var(--grey-300)] bg-white px-3 text-left',
                                'hover:bg-[var(--grey-50)] transition-colors',
                                'focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none focus-visible:border-[var(--purple-500)]',
                                !selectedCategory && 'text-[var(--grey-500)]',
                                selectedCategory && 'rounded-r-none border-r-0'
                            )}
                        >
                            <span className="truncate">{selectedCategory || t('receipts.filters.allCategories')}</span>
                            <ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 text-[var(--grey-500)]" />
                        </BaseButton>
                    </PopoverTrigger>

                    <PopoverContent
                        align="start"
                        side="bottom"
                        sideOffset={4}
                        className="w-[var(--radix-popover-trigger-width)] p-0 border border-[var(--grey-200)] bg-white rounded-xl shadow-lg"
                    >
                        <Command shouldFilter={false}>
                            <CommandInput
                                placeholder={t('receipts.filters.searchPlaceholder')}
                                value={search}
                                onValueChange={setSearch}
                                className="h-9 text-sm"
                            />
                            <CommandList>
                                <CommandEmpty>{t('receipts.filters.noResults')}</CommandEmpty>
                                <CommandGroup>
                                    {filteredCategories.map((c) => (
                                        <CommandItem key={c} onSelect={() => handleSelect(c)} className="text-sm">
                                            {c}
                                            {filters.category === c && <CheckIcon className="ml-auto h-4 w-4 text-[var(--purple-500)]" />}
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
                {selectedCategory && (
                    <button
                        type="button"
                        onClick={() => onChange('category', null)}
                        className="flex items-center h-10 px-2 border border-l-0 border-[var(--grey-300)] bg-white rounded-r-xl hover:bg-[var(--grey-50)] transition-colors"
                    >
                        <X className="h-3.5 w-3.5 text-[var(--grey-500)] hover:text-[var(--grey-900)]" />
                    </button>
                )}
            </div>
        </ReceiptFilterField>
    );
};

export default CategoryFilter;
