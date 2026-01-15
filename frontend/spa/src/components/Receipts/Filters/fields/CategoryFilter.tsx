import { useTranslation } from 'react-i18next';
import { useState, useMemo, useCallback } from 'react';
import { CheckIcon, ChevronDownIcon, MagnifyingGlassIcon } from '@radix-ui/react-icons';

import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/shadecn/Popover';
import { Command, CommandGroup, CommandInput, CommandItem, CommandList, CommandEmpty } from '@/components/ui/Command';
import { BaseButton } from '@/components/ui/shadecn/BaseButton';
import { ReceiptFilterField } from '@/components/Receipts/Filters/ReceiptFilterField';
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
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <BaseButton
                        variant="outline"
                        aria-haspopup="listbox"
                        aria-expanded={open}
                        className={cn(
                            'relative w-full max-w-[280px] justify-between text-sm font-normal rounded-[var(--radius-l)] border border-[var(--grey-600)] bg-[var(--grey-white)]',
                            'focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none pl-10 pr-3 py-2 text-left',
                            !selectedCategory && 'text-[var(--grey-800)]'
                        )}
                    >
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--grey-700)] pointer-events-none" />
                        {selectedCategory || t('receipts.filters.searchPlaceholder')}
                        <ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </BaseButton>
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
                        <CommandInput placeholder={t('receipts.filters.searchPlaceholder')} value={search} onValueChange={setSearch} className="h-9 text-sm" />
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
        </ReceiptFilterField>
    );
};

export default CategoryFilter;
