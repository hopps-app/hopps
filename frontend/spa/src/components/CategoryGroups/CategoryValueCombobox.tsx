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
    /** Overrides the default empty-state text. */
    placeholder?: string;
};

/**
 * Searchable value picker backed by the server-side, paginated value endpoint — so a group can hold thousands of values
 * (e.g. a whole chart of accounts) without ever loading them all at once.
 */
const CategoryValueCombobox: FC<CategoryValueComboboxProps> = ({ groupId, value, onChange, warn, disabled, placeholder }) => {
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
        <div className="relative w-full">
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <button
                        type="button"
                        disabled={disabled}
                        className={cn(
                            'flex h-10 w-full cursor-pointer items-center justify-between gap-2 rounded-xl border bg-white px-3.5 text-left text-[14px] text-[var(--font-color)] dark:bg-[var(--purple-50)]',
                            'border-[#E0E0E6] transition-shadow focus:border-[#9955CC] focus:outline-none focus:ring-[3px] focus:ring-[#F3EAFB] dark:border-gray-700',
                            'disabled:cursor-not-allowed disabled:opacity-50',
                            !value && 'text-[#6B6B76] dark:text-gray-400',
                            warn && 'border-[#B47C18]',
                            // Room for the clear button sitting on top of the field.
                            value && !disabled && 'pr-10'
                        )}
                        aria-haspopup="listbox"
                        aria-expanded={open}
                    >
                        <span className="truncate">{value || placeholder || t('categoryGroups.fields.valuePlaceholder')}</span>
                        {!value && <ChevronDownIcon className="h-4 w-4 shrink-0 text-[#666] dark:text-gray-400" aria-hidden="true" />}
                    </button>
                </PopoverTrigger>
                <PopoverContent align="start" sideOffset={6} className="w-full min-w-[220px] rounded-2xl border-border-soft p-2 shadow-card-hover">
                    {/* Same panel as the bommel and group pickers: rounded card, search as a filled pill, rounded rows. */}
                    <Command
                        shouldFilter={false}
                        className="[&_[cmdk-input-wrapper]]:mb-1.5 [&_[cmdk-input-wrapper]]:h-9 [&_[cmdk-input-wrapper]]:rounded-[10px] [&_[cmdk-input-wrapper]]:border-b-0 [&_[cmdk-input-wrapper]]:bg-hover-effect [&_[cmdk-input-wrapper]]:px-2.5"
                    >
                        <CommandInput placeholder={t('common.search')} className="h-9 py-0" value={rawQuery} onValueChange={setRawQuery} />
                        <CommandList className="max-h-[264px]">
                            <CommandEmpty>{isLoading ? t('common.loading') : t('categoryGroups.fields.noValues')}</CommandEmpty>
                            <CommandGroup className="p-0">
                                {items.map((item) => (
                                    <CommandItem
                                        key={item.id}
                                        value={String(item.id)}
                                        className={cn(
                                            'rounded-[10px] px-2.5 py-2 text-sm',
                                            value === item.value
                                                ? 'bg-purple-100 font-bold text-purple-700 data-[selected=true]:bg-purple-100 data-[selected=true]:text-purple-700'
                                                : 'font-medium'
                                        )}
                                        onSelect={() => {
                                            onChange(item.value);
                                            setOpen(false);
                                        }}
                                    >
                                        <span className="truncate">{item.value}</span>
                                        <CheckIcon className={cn('ml-auto h-4 w-4', value === item.value ? 'opacity-100' : 'opacity-0')} aria-hidden="true" />
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
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-[#9A9AA3] transition-colors hover:text-[#B12C4C]"
                    aria-label={t('common.delete')}
                >
                    <X className="h-4 w-4" aria-hidden="true" />
                </button>
            )}
        </div>
    );
};

export default CategoryValueCombobox;
