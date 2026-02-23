'use client';

import { CheckIcon, ChevronDownIcon } from '@radix-ui/react-icons';
import { X } from 'lucide-react';
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
        <div className="flex items-center w-full">
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <button
                        type="button"
                        className={cn(
                            'flex items-center w-full h-10 justify-between text-sm border border-[#d1d5db] rounded-xl px-3 py-3 text-left cursor-pointer bg-primary-foreground',
                            !selectedBommel && 'hover:border-[var(--purple-500)] hover:text-[var(--purple-500)]',
                            'transition-colors focus:ring-primary focus:outline-none',
                            !selectedBommel && 'text-[#666]',
                            selectedBommel && 'rounded-r-none border-r-0'
                        )}
                        aria-haspopup="listbox"
                        aria-expanded={open}
                        aria-label={selectedBommel ? `${t('bommel.select')}: ${selectedBommel.name}` : t('bommel.select')}
                    >
                        <span className="flex items-center gap-2">
                            {selectedBommel?.emoji && <Emoji emoji={selectedBommel.emoji} className="text-lg" />}
                            {selectedBommel ? selectedBommel.name : t('invoiceUpload.selectBommel')}
                        </span>
                        {!selectedBommel && <ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 text-[#666]" aria-hidden="true" />}
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
                    onClick={(e) => {
                        e.stopPropagation();
                        onDeselectBommel();
                    }}
                    className="flex items-center h-10 py-3 px-3 border border-l-0 border-[#d1d5db] bg-white rounded-r-xl transition-colors"
                    aria-label={t('common.delete')}
                >
                    <X className="w-4 h-4 text-[var(--purple-500)]" aria-hidden="true" />
                </button>
            )}
        </div>
    );
};

export default memo(InvoiceUploadFormBommelSelector);
