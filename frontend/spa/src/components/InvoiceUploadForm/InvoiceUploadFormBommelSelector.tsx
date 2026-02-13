'use client';

import { CheckIcon, ChevronDownIcon, TrashIcon } from '@radix-ui/react-icons';
import { FC, memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/Command';
import Emoji from '@/components/ui/Emoji';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/shadecn/Popover';
import { cn } from '@/lib/utils';
import { useBommelsStore } from '@/store/bommels/bommelsStore';

type InvoiceUploadFormBommelSelectorprops = {
    value?: number | null;
    onChange: (id: number | null | undefined) => void;
};

const InvoiceUploadFormBommelSelector: FC<InvoiceUploadFormBommelSelectorprops> = ({ value, onChange }) => {
    const { allBommels } = useBommelsStore();
    const { t } = useTranslation();

    const [open, setOpen] = useState(false);

    // Find the selected bommel based on the value prop
    const selectedBommel = value ? (allBommels.find((b) => b.id === value) ?? null) : null;

    const onBommelSelected = useCallback(
        (currentValue: string) => {
            const searchedBommel = allBommels.find((bomm) => bomm?.name?.toLowerCase() === currentValue.toLowerCase()) || null;

            if (searchedBommel) {
                onChange(searchedBommel.id);
            }

            setOpen(false);
        },
        [allBommels, onChange]
    );

    const onDeselectBommel = useCallback(() => {
        onChange(null);
    }, [onChange]);

    return (
        <div className="w-full relative">
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <button
                        type="button"
                        className={cn(
                            'flex items-center justify-between w-full text-sm border border-gray-300 rounded-xl px-4 py-3 text-left cursor-pointer bg-primary-foreground',
                            'focus:ring-2 focus:ring-primary focus:outline-none'
                        )}
                        aria-haspopup="listbox"
                        aria-expanded={open}
                        aria-label={selectedBommel ? `${t('bommel.select')}: ${selectedBommel.name}` : t('bommel.select')}
                    >
                        <span className="flex items-center gap-2">
                            {selectedBommel?.emoji && <Emoji emoji={selectedBommel.emoji} className="text-lg" />}
                            {selectedBommel ? selectedBommel.name : t('invoiceUpload.selectBommel')}
                        </span>
                        {!selectedBommel && <ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" aria-hidden="true" />}
                    </button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                    <Command>
                        <CommandInput placeholder={`${t('common.search')}`} className="h-9" />
                        <CommandList>
                            <CommandEmpty>{t('bommel.empty')}</CommandEmpty>
                            <CommandGroup>
                                {allBommels.map((bommel) => (
                                    <CommandItem key={bommel.id} value={bommel.name} onSelect={(currentValue) => onBommelSelected(currentValue)}>
                                        {bommel.emoji && <Emoji emoji={bommel.emoji} className="text-base" />}
                                        {bommel.name}
                                        <CheckIcon
                                            className={cn('ml-auto', selectedBommel?.name === bommel.name ? 'opacity-100' : 'opacity-0')}
                                            aria-hidden="true"
                                        />
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
            {selectedBommel && (
                <button
                    type="button"
                    onClick={onDeselectBommel}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-500"
                    aria-label={t('common.delete')}
                >
                    <TrashIcon className="w-4 h-4" aria-hidden="true" />
                </button>
            )}
        </div>
    );
};

export default memo(InvoiceUploadFormBommelSelector);
