import { FC, useEffect, useMemo, useState } from 'react';
import { debounce } from 'lodash';
import { ChevronDownIcon, CheckIcon, Cross2Icon } from '@radix-ui/react-icons';
import { useTranslation } from 'react-i18next';

import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/Command';
import { BaseButton } from '@/components/ui/shadecn/BaseButton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/shadecn/Popover';
import { cn } from '@/lib/utils';

type SearchFieldPropsType = {
    items: string[];
    onSearch: (query: string) => void;
    placeholder?: string;
};

const SearchField: FC<SearchFieldPropsType> = ({ items, onSearch, placeholder }) => {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [selectedItem, setSelectedItem] = useState<string | null>(null);

    const filteredItems = useMemo(() => items.filter((item) => item.toLowerCase().includes(search.toLowerCase())), [items, search]);

    const debouncedSearch = useMemo(
        () =>
            debounce((query: string) => {
                onSearch(query);
            }, 300),
        [onSearch]
    );

    useEffect(() => {
        return () => {
            debouncedSearch.cancel();
        };
    }, [debouncedSearch]);

    const handleInputChange = (value: string) => {
        setSearch(value);
        debouncedSearch(value);
    };

    const handleSelect = (value: string | null) => {
        setSelectedItem(value);
        setOpen(false);
        onSearch(value ?? '');
    };

    return (
        <div className="flex items-center">
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild className={cn(open && '')}>
                    <BaseButton
                        variant="outline"
                        aria-haspopup="listbox"
                        aria-expanded={open}
                        className={cn(
                            'relative w-full justify-between text-sm font-normal',
                            'h-10 rounded-md border border-slate-300 bg-white',
                            'px-3 py-0 text-gray-600',
                            'flex items-center'
                        )}
                    >
                        <span className="truncate">{selectedItem ?? placeholder}</span>

                        {selectedItem ? (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleSelect(null); // 👈 clear
                                }}
                                className="p-1 rounded hover:bg-slate-100"
                            >
                                <Cross2Icon className="h-4 w-4 text-slate-500" />
                            </button>
                        ) : (
                            <ChevronDownIcon className="h-4 w-4 opacity-50" />
                        )}
                    </BaseButton>
                </PopoverTrigger>

                <PopoverContent align="start" sideOffset={4} className="w-[var(--radix-popover-trigger-width)] p-0">
                    <Command shouldFilter={false}>
                        <CommandInput placeholder={t('common.search')} value={search} onValueChange={handleInputChange} className="h-9 text-sm border-b" />

                        <CommandList className="pt-0">
                            <CommandEmpty>{t('receipts.filters.noResults')}</CommandEmpty>

                            <CommandGroup className="pt-0">
                                {filteredItems.map((item) => (
                                    <CommandItem key={item} onSelect={() => handleSelect(item)} className="text-sm">
                                        {item}
                                        {selectedItem === item && <CheckIcon className="ml-auto h-4 w-4 text-purple-500" />}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
        </div>
    );
};

export default SearchField;
