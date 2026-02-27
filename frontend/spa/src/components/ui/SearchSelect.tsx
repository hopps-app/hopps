import { CheckIcon, ChevronDownIcon } from '@radix-ui/react-icons';
import * as _ from 'lodash';
import { X } from 'lucide-react';
import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { Label } from './Label';

import { Command, CommandGroup, CommandInput, CommandItem, CommandList, CommandEmpty } from '@/components/ui/Command';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/shadecn/Popover';
import { cn } from '@/lib/utils';

export interface SearchSelectItem {
    label: string;
    value: string;
}

interface SearchSelectProps {
    items: SearchSelectItem[];
    value?: string;
    onValueChange?: (value: string) => void;
    label?: string;
    placeholder?: string;
    searchPlaceholder?: string;
    className?: string;
    triggerClassName?: string;
    error?: string;
    required?: boolean;
    disabled?: boolean;
    hideSearch?: boolean;
}

function SearchSelect({
    items,
    value,
    onValueChange,
    label,
    placeholder,
    searchPlaceholder,
    className,
    triggerClassName,
    error,
    required,
    disabled,
    hideSearch,
}: SearchSelectProps) {
    const { t } = useTranslation();
    const [id] = useState(_.uniqueId('search-select-'));
    const errorId = `${id}-error`;
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');

    const filteredItems = useMemo(() => {
        if (!search) return items;
        return items.filter((item) => item.label.toLowerCase().includes(search.toLowerCase()));
    }, [search, items]);

    const selectedItem = items.find((item) => item.value === value);

    const handleSelect = useCallback(
        (itemValue: string) => {
            onValueChange?.(itemValue);
            setOpen(false);
            setSearch('');
        },
        [onValueChange]
    );

    return (
        <div className={cn('grid w-full items-center gap-1.5', className)}>
            {label && (
                <Label htmlFor={id} className={error ? 'text-red-500' : ''}>
                    {label}
                </Label>
            )}
            <div className="flex items-center w-full">
                <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                        <button
                            id={id}
                            type="button"
                            disabled={disabled}
                            aria-haspopup="listbox"
                            aria-expanded={open}
                            aria-invalid={error ? true : undefined}
                            aria-describedby={error ? errorId : undefined}
                            aria-required={required || undefined}
                            className={cn(
                                'flex items-center w-full h-10 justify-between text-sm font-normal',
                                'rounded-xl border border-[#d1d5db] bg-white px-3 text-left',
                                'outline-none transition-colors',
                                'hover:border-[var(--purple-500)]',
                                'focus-visible:border-[var(--purple-500)]',
                                'data-[state=open]:border-[var(--purple-500)]',
                                'disabled:cursor-not-allowed disabled:opacity-50',
                                !selectedItem && 'text-muted-foreground',
                                selectedItem && 'rounded-r-none border-r-0',
                                error && 'border-red-500 focus-visible:border-red-500',
                                triggerClassName
                            )}
                        >
                            <span className="truncate">{selectedItem?.label || placeholder || t('common.search')}</span>
                            {!selectedItem && <ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 text-[#666]" />}
                        </button>
                    </PopoverTrigger>
                    <PopoverContent align="start" side="bottom" sideOffset={4} className="w-[--radix-popover-trigger-width] p-0">
                        <Command shouldFilter={false}>
                            {!hideSearch && (
                                <CommandInput
                                    placeholder={searchPlaceholder || t('common.search')}
                                    value={search}
                                    onValueChange={setSearch}
                                    className="h-9 text-sm"
                                />
                            )}
                            <CommandList>
                                <CommandEmpty>{t('common.noResults')}</CommandEmpty>
                                <CommandGroup>
                                    {filteredItems.map((item) => (
                                        <CommandItem key={item.value} onSelect={() => handleSelect(item.value)} className="text-sm">
                                            {item.label}
                                            {value === item.value && <CheckIcon className="ml-auto h-4 w-4 text-[var(--purple-500)]" />}
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
                {selectedItem && (
                    <button
                        type="button"
                        onClick={() => onValueChange?.('')}
                        className="flex items-center h-10 px-3 border border-l-0 border-[#d1d5db] bg-white rounded-r-xl transition-colors"
                    >
                        <X className="h-3.5 w-3.5 text-[var(--purple-500)]" />
                    </button>
                )}
            </div>
            {error && (
                <p id={errorId} role="alert" className="text-xs text-red-500 animate-in fade-in slide-in-from-top-1 duration-200">
                    {error}
                </p>
            )}
        </div>
    );
}

export default SearchSelect;
