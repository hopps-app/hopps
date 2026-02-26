import { ChevronDownIcon } from '@radix-ui/react-icons';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ReceiptFilterField } from '@/components/Receipts/Filters/ReceiptFilterField';
import { ReceiptFiltersState, SetFilterFn } from '@/components/Receipts/types';
import { Checkbox } from '@/components/ui/shadecn/Checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/shadecn/Popover';

interface StatusFilterProps {
    filters: ReceiptFiltersState;
    onChange: SetFilterFn;
    label?: string;
}

const STATUS_KEYS = ['unpaid', 'draft', 'unassigned'] as const;

export const StatusFilter = ({ filters, onChange, label }: StatusFilterProps) => {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);

    const isAllSelected = useMemo(() => STATUS_KEYS.every((key) => !filters.status[key]), [filters.status]);

    const selectedCount = useMemo(() => STATUS_KEYS.filter((key) => filters.status[key]).length, [filters.status]);

    const handleToggle = useCallback(
        (key: 'unpaid' | 'draft' | 'unassigned', checked: boolean) => {
            onChange('status', { ...filters.status, [key]: checked });
        },
        [filters.status, onChange]
    );

    const handleAllToggle = useCallback(() => {
        onChange('status', { unpaid: false, draft: false, unassigned: false });
    }, [onChange]);

    const statusLabels: Record<(typeof STATUS_KEYS)[number], string> = {
        unpaid: t('receipts.filters.onlyUnpaid'),
        draft: t('receipts.filters.drafts'),
        unassigned: t('receipts.filters.unassigned'),
    };

    return (
        <ReceiptFilterField>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <button
                        type="button"
                        className="flex items-center justify-between w-full h-10 px-3 rounded-xl border border-[#d1d5db] bg-white text-sm text-[var(--grey-900)] outline-none hover:border-[var(--purple-500)] hover:text-[var(--purple-500)] transition-colors focus-visible:border-[var(--purple-500)] data-[state=open]:border-[var(--purple-500)]"
                    >
                        <span className="flex items-center gap-2">
                            <span>{label || t('receipts.filters.selectStatus')}</span>
                            {selectedCount > 0 && (
                                <span className="flex items-center justify-center h-5 min-w-5 px-1 rounded-full bg-[var(--purple-500)] text-white text-xs font-medium">
                                    {selectedCount}
                                </span>
                            )}
                        </span>
                        <ChevronDownIcon className="h-4 w-4 text-[var(--grey-900)]" />
                    </button>
                </PopoverTrigger>

                <PopoverContent align="start" side="bottom" sideOffset={4} className="w-52 p-2 rounded-md shadow-lg">
                    <div className="flex flex-col gap-1">
                        <label className="flex items-center gap-2.5 px-2 py-1.5 rounded-md cursor-pointer transition-colors">
                            <Checkbox
                                checked={isAllSelected}
                                onCheckedChange={handleAllToggle}
                                className="h-[18px] w-[18px] rounded border-[1.5px] border-[#ccc] bg-transparent data-[state=checked]:bg-[var(--purple-500)] data-[state=checked]:border-[var(--purple-500)]"
                            />
                            <span className="text-sm text-[var(--grey-900)]">{t('receipts.filters.all')}</span>
                        </label>

                        {STATUS_KEYS.map((key) => (
                            <label key={key} className="flex items-center gap-2.5 px-2 py-1.5 rounded-md cursor-pointer transition-colors">
                                <Checkbox
                                    checked={filters.status[key]}
                                    onCheckedChange={(checked: boolean) => {
                                        handleToggle(key, checked);
                                    }}
                                    className="h-[18px] w-[18px] rounded border-[1.5px] border-[#ccc] bg-transparent data-[state=checked]:bg-[var(--purple-500)] data-[state=checked]:border-[var(--purple-500)]"
                                />
                                <span className="text-sm text-[var(--grey-900)]">{statusLabels[key]}</span>
                            </label>
                        ))}
                    </div>
                </PopoverContent>
            </Popover>
        </ReceiptFilterField>
    );
};
