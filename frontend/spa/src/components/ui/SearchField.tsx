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
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        aria-haspopup="listbox"
                        aria-expanded={open}
                        className={cn(
                            'relative w-full justify-between text-sm font-normal',
                            'h-10 rounded-[10px] border border-slate-300 bg-white',
                            'px-3 py-0 text-[var(--grey-black)]',
                            'flex items-center',
                            'focus:outline-none focus:border-primary hover:bg-white hover:border-primary'
                        )}
                    >
                        {selectedItem}
                        {!selectedItem && <span className="truncate select-none text-gray-400">{placeholder}</span>}

                        {selectedItem ? (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleSelect(null);
                                }}
                                className="flex items-center justify-center w-4 h-4 text-[var(--purple-500)] hover:text-[var(--purple-700)] transition"
                            >
                                <Cross2Icon className="w-4 h-4" />
                            </button>
                        ) : (
                            <ChevronDownIcon className="h-4 w-4 text-gray-600" />
                        )}
                    </BaseButton>
                </PopoverTrigger>

                <PopoverContent align="start" sideOffset={4} className="w-[var(--radix-popover-trigger-width)] p-0">
                    <Command shouldFilter={false}>
                        <CommandInput
                            placeholder={t('common.search')}
                            value={search}
                            onValueChange={handleInputChange}
                            className="h-9 text-sm text-gray-400 border-b"
                        />

                        <CommandList className="pt-1">
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
