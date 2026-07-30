import { CheckIcon, ChevronDownIcon } from '@radix-ui/react-icons';
import { X } from 'lucide-react';
import { FC, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/Command';
import Emoji from '@/components/ui/Emoji';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/shadecn/Popover';
import { cn } from '@/lib/utils';
import { useBommelsStore } from '@/store/bommels/bommelsStore';

type BommelMultiSelectorProps = {
    value: number[];
    onChange: (ids: number[]) => void;
    disabled?: boolean;
};

/**
 * Multi-select variant of the bommel picker (reuses the same Command/Popover combobox as the single selector). Selected
 * bommels are shown as removable chips; an empty selection means the group applies to no bommel.
 */
const BommelMultiSelector: FC<BommelMultiSelectorProps> = ({ value, onChange, disabled }) => {
    const { allBommels } = useBommelsStore();
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);

    const selected = useMemo(() => allBommels.filter((b) => b.id != null && value.includes(b.id)), [allBommels, value]);

    const toggle = (id: number) => {
        if (value.includes(id)) {
            onChange(value.filter((v) => v !== id));
        } else {
            onChange([...value, id]);
        }
    };

    return (
        <div className="flex flex-col gap-2">
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <button
                        type="button"
                        disabled={disabled}
                        className={cn(
                            'flex items-center w-full min-h-10 justify-between text-sm border border-[#d1d5db] dark:border-gray-700 rounded-xl px-3 py-2 text-left cursor-pointer bg-white dark:bg-[var(--purple-50)] text-[var(--font-color)]',
                            'hover:border-[var(--purple-500)] transition-colors focus:outline-none',
                            'disabled:cursor-not-allowed disabled:opacity-50'
                        )}
                        aria-haspopup="listbox"
                        aria-expanded={open}
                    >
                        <span className="text-[#666] dark:text-gray-400">
                            {selected.length > 0
                                ? t('categoryGroups.modal.bommelSelected', { count: selected.length })
                                : t('categoryGroups.modal.bommelPlaceholder')}
                        </span>
                        <ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 text-[#666] dark:text-gray-400" aria-hidden="true" />
                    </button>
                </PopoverTrigger>
                <PopoverContent className="z-[110] w-full p-0">
                    <Command>
                        <CommandInput placeholder={t('common.search')} className="h-9" />
                        <CommandList>
                            <CommandEmpty>{t('bommel.empty')}</CommandEmpty>
                            <CommandGroup>
                                {allBommels.map((bommel) => {
                                    const isSelected = bommel.id != null && value.includes(bommel.id);
                                    return (
                                        <CommandItem key={bommel.id} value={bommel.name} onSelect={() => bommel.id != null && toggle(bommel.id)}>
                                            {bommel.emoji && <Emoji emoji={bommel.emoji} className="text-base" />}
                                            {bommel.name}
                                            <CheckIcon className={cn('ml-auto', isSelected ? 'opacity-100' : 'opacity-0')} aria-hidden="true" />
                                        </CommandItem>
                                    );
                                })}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>

            {selected.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {selected.map((bommel) => (
                        <span
                            key={bommel.id}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[13px] font-medium bg-[#F3EAFB] text-[#7E3FB4]"
                        >
                            {bommel.emoji && <Emoji emoji={bommel.emoji} className="text-sm" />}
                            {bommel.name}
                            {!disabled && (
                                <button
                                    type="button"
                                    onClick={() => bommel.id != null && toggle(bommel.id)}
                                    className="text-[#7E3FB4]/70 hover:text-[#7E3FB4]"
                                    aria-label={t('common.delete')}
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            )}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
};

export default BommelMultiSelector;
