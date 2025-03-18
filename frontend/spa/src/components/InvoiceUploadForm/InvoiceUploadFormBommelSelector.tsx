'use client';

import { Check, ChevronsUpDown, Trash2 } from 'lucide-react';
import { FC, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/utils';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/Command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/shadecn/Popover';
import { useBommelsStore } from '@/store/bommels/bommelsStore';
import { Bommel } from '@/services/api/types/Bommel';

type InvoiceUploadFormBommelSelectorprops = {
    onChange: (id: number | null) => void;
};

const InvoiceUploadFormBommelSelector: FC<InvoiceUploadFormBommelSelectorprops> = ({ onChange }) => {
    const { allBommels } = useBommelsStore();
    const { t } = useTranslation();

    const [open, setOpen] = useState(false);
    const [selectedBommel, setSelectedBommel] = useState<Bommel | null>(null);

    const onBommelSelected = useCallback(
        (currentValue: string) => {
            const searchedBommel = allBommels.find((bomm) => bomm.name.toLowerCase() === currentValue.toLowerCase()) || null;

            if (searchedBommel) {
                setSelectedBommel(searchedBommel);
                onChange(searchedBommel.id);
            }

            setOpen(false);
        },
        [selectedBommel]
    );

    const onDeselectBommel = () => {
        setSelectedBommel(null);
        onChange(null);
    };

    return (
        <div className="w-full relative">
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <div
                        className={cn(
                            'flex items-center justify-between w-full border border-gray-300 rounded-2xl px-3 py-2 text-left cursor-pointer',
                            'focus:ring-2 focus:ring-primary focus:outline-none'
                        )}
                    >
                        <span>{selectedBommel ? selectedBommel?.name : t('invoiceUpload.selectBommel')}</span>
                        {!selectedBommel && <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />}
                    </div>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                    <Command>
                        <CommandInput placeholder={`${t('common.search')}`} className="h-9" />
                        <CommandList>
                            <CommandEmpty>No Bommel found.</CommandEmpty>
                            <CommandGroup>
                                {allBommels.map((bommel) => (
                                    <CommandItem key={bommel.id} value={bommel.name} onSelect={(currentValue) => onBommelSelected(currentValue)}>
                                        {bommel.name}
                                        <Check className={cn('ml-auto', selectedBommel?.name === bommel.name ? 'opacity-100' : 'opacity-0')} />
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
            {selectedBommel && (
                <button onClick={onDeselectBommel} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-500">
                    <Trash2 className="w-4 h-4" />
                </button>
            )}
        </div>
    );
};

export default InvoiceUploadFormBommelSelector;
