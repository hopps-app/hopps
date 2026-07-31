import { CheckIcon, ChevronDownIcon } from '@radix-ui/react-icons';
import { X } from 'lucide-react';
import { FC, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/Command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/shadecn/Popover';
import { useCategoryGroupValues } from '@/hooks/queries/useCategoryGroups';
import { cn } from '@/lib/utils';

type CategoryValueComboboxProps = {
    groupId: number;
    value: string | undefined;
    onChange: (value: string | undefined) => void;
    /** Mark the field as an unmet requirement (warn border) without an inline error text. */
    warn?: boolean;
    disabled?: boolean;
};

/**
 * Searchable value picker backed by the server-side, paginated value endpoint — so a group can hold thousands of values
 * (e.g. a whole chart of accounts) without ever loading them all at once.
 */
const CategoryValueCombobox: FC<CategoryValueComboboxProps> = ({ groupId, value, onChange, warn, disabled }) => {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const [rawQuery, setRawQuery] = useState('');
    const [query, setQuery] = useState('');

    // debounce the typed query so we don't hit the server on every keystroke
    useEffect(() => {
        const handle = setTimeout(() => setQuery(rawQuery), 200);
        return () => clearTimeout(handle);
    }, [rawQuery]);

    const { data, isLoading } = useCategoryGroupValues(groupId, query, open);
    const items = data?.items ?? [];

    return (
        <div className="flex items-center w-full">
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <button
                        type="button"
                        disabled={disabled}
                        className={cn(
                            'flex items-center w-full h-10 justify-between text-sm border rounded-xl px-3 py-3 text-left cursor-pointer bg-white dark:bg-[var(--purple-50)] text-[var(--font-color)]',
                            'border-[#d1d5db] dark:border-gray-700 hover:border-[var(--purple-500)] transition-colors focus:outline-none',
                            'disabled:cursor-not-allowed disabled:opacity-50',
                            !value && 'text-[#666] dark:text-gray-400',
                            warn && 'border-[#B47C18]',
                            value && !disabled && 'rounded-r-none border-r-0'
                        )}
                        aria-haspopup="listbox"
                        aria-expanded={open}
                    >
                        <span className="truncate">{value || t('categoryGroups.fields.valuePlaceholder')}</span>
                        {!value && <ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 text-[#666] dark:text-gray-400" aria-hidden="true" />}
                    </button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                    <Command shouldFilter={false}>
                        <CommandInput placeholder={t('common.search')} className="h-9" value={rawQuery} onValueChange={setRawQuery} />
                        <CommandList>
                            <CommandEmpty>{isLoading ? t('common.loading') : t('categoryGroups.fields.noValues')}</CommandEmpty>
                            <CommandGroup>
                                {items.map((item) => (
                                    <CommandItem
                                        key={item.id}
                                        value={String(item.id)}
                                        onSelect={() => {
                                            onChange(item.value);
                                            setOpen(false);
                                        }}
                                    >
                                        {item.value}
                                        <CheckIcon className={cn('ml-auto', value === item.value ? 'opacity-100' : 'opacity-0')} aria-hidden="true" />
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
            {value && !disabled && (
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onChange(undefined);
                    }}
                    className={cn(
                        'flex items-center h-10 py-3 px-3 border border-l-0 rounded-r-xl transition-colors bg-white dark:bg-[var(--purple-50)]',
                        warn ? 'border-[#B47C18]' : 'border-[#d1d5db] dark:border-gray-700'
                    )}
                    aria-label={t('common.delete')}
                >
                    <X className="w-4 h-4 text-[var(--purple-500)]" aria-hidden="true" />
                </button>
            )}
        </div>
    );
};

export default CategoryValueCombobox;
