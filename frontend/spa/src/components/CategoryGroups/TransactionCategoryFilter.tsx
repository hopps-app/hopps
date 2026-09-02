import { CategoryGroupResponse } from '@hopps/api-client';
import { Check, Plus, X } from 'lucide-react';
import { FC, useState } from 'react';
import { useTranslation } from 'react-i18next';

import CategoryValueCombobox from '@/components/CategoryGroups/CategoryValueCombobox';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/Command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/shadecn/Popover';
import { cn } from '@/lib/utils';

/** One category filter row: a group and, once chosen, the value being filtered on. */
export type CategoryFilterRow = { groupId: number | null; value?: string };

type TransactionCategoryFilterProps = {
    /** All category groups of the organization (lightweight list). */
    groups: CategoryGroupResponse[];
    /** One entry per filter row, in display order. A row without a group is one the user has not filled in yet. */
    rows: CategoryFilterRow[];
    onAddRow: () => void;
    onRemoveRow: (index: number) => void;
    onChangeGroup: (index: number, groupId: number | null) => void;
    onChangeValue: (index: number, value: string | undefined) => void;
};

// Same panel shape as the bommel picker: rounded card, filled search pill, purple tint on the chosen row.
// cmdk's `data-[selected]` marks the keyboard row and its attribute selector outranks a plain class, so the
// chosen state repeats itself under that variant to survive arrowing past.
const itemCls = (chosen: boolean) =>
    cn(
        'rounded-[10px] px-2.5 py-2 text-sm',
        chosen ? 'bg-purple-100 font-bold text-purple-700 data-[selected=true]:bg-purple-100 data-[selected=true]:text-purple-700' : 'font-medium'
    );

const fieldCls =
    'flex h-10 w-full items-center justify-between gap-2 rounded-xl border border-[#E0E0E6] bg-white px-3.5 text-left text-[14px] text-[#1B1B1F] transition-shadow focus:border-[#9955CC] focus:outline-none focus:ring-[3px] focus:ring-[#F3EAFB]';

/**
 * Category-group filter for the transactions view. Rather than surfacing every group at once (there can be hundreds —
 * a whole chart of accounts), the user adds a row at a time: pick the group, then a value for it. Values of one group
 * OR together and the groups AND, which is why a finished group reads as a single card listing its values.
 */
const TransactionCategoryFilter: FC<TransactionCategoryFilterProps> = ({ groups, rows, onAddRow, onRemoveRow, onChangeGroup, onChangeValue }) => {
    const { t } = useTranslation();
    // Which row's group dropdown is open, by index; null when none is.
    const [openRow, setOpenRow] = useState<number | null>(null);

    // A row with both halves picked has nothing left to ask, so it collapses. Rows of the same group collapse into
    // one card together, in the order the group first appeared.
    const cards: { groupId: number; name: string; values: string[] }[] = [];
    const pending: { row: CategoryFilterRow; index: number }[] = [];

    rows.forEach((row, index) => {
        const group = row.groupId != null ? groups.find((g) => g.id === row.groupId) : undefined;
        if (!group || !row.value) {
            pending.push({ row, index });
            return;
        }
        const existing = cards.find((card) => card.groupId === group.id);
        if (existing) {
            if (!existing.values.includes(row.value)) existing.values.push(row.value);
        } else {
            cards.push({ groupId: group.id as number, name: group.name ?? String(group.id), values: [row.value] });
        }
    });

    return (
        <div className="flex flex-col gap-2 sm:col-span-2">
            <label className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#9A9AA3]">{t('transactions.filters.categoryGroups')}</label>

            <div className="flex flex-col items-start gap-2.5">
                {cards.map((card) => (
                    <span
                        key={card.groupId}
                        className="inline-flex max-w-full items-center gap-2 rounded-xl bg-[#F3EAFB] px-3 py-1.5 text-[13px] font-semibold text-[#7E3FB4]"
                    >
                        <span className="truncate">
                            {card.name} : {card.values.join(', ')}
                        </span>
                        <button
                            type="button"
                            onClick={() => {
                                // Highest index first, so the earlier ones do not shift while removing.
                                rows.map((row, index) => ({ row, index }))
                                    .filter(({ row }) => row.groupId === card.groupId && row.value)
                                    .map(({ index }) => index)
                                    .reverse()
                                    .forEach(onRemoveRow);
                            }}
                            className="shrink-0 text-[#9955CC] transition-colors hover:text-[#B12C4C]"
                            aria-label={t('transactions.filters.removeCategoryGroup')}
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    </span>
                ))}

                {pending.map(({ row, index }) => {
                    const group = row.groupId != null ? groups.find((g) => g.id === row.groupId) : undefined;

                    return (
                        <div key={index} className="flex w-full flex-wrap items-center gap-2.5">
                            <Popover open={openRow === index} onOpenChange={(next) => setOpenRow(next ? index : null)}>
                                <PopoverTrigger asChild>
                                    <button type="button" className={`${fieldCls} sm:w-48`} aria-haspopup="listbox" aria-expanded={openRow === index}>
                                        <span className={`truncate ${group ? '' : 'text-[#6B6B76]'}`}>
                                            {group?.name ?? t('transactions.filters.selectGroup')}
                                        </span>
                                        <ChevronIcon />
                                    </button>
                                </PopoverTrigger>
                                <PopoverContent
                                    align="start"
                                    sideOffset={6}
                                    className="z-[110] w-[260px] rounded-2xl border-border-soft p-2 shadow-card-hover"
                                >
                                    <Command className="[&_[cmdk-input-wrapper]]:mb-1.5 [&_[cmdk-input-wrapper]]:h-9 [&_[cmdk-input-wrapper]]:rounded-[10px] [&_[cmdk-input-wrapper]]:border-b-0 [&_[cmdk-input-wrapper]]:bg-hover-effect [&_[cmdk-input-wrapper]]:px-2.5">
                                        <CommandInput placeholder={t('transactions.filters.searchGroup')} className="h-9 py-0" />
                                        <CommandList className="max-h-[264px]">
                                            <CommandEmpty>{t('transactions.filters.noGroups')}</CommandEmpty>
                                            <CommandGroup className="p-0">
                                                {groups.map((g) => (
                                                    <CommandItem
                                                        key={g.id}
                                                        value={g.name}
                                                        className={itemCls(g.id === row.groupId)}
                                                        onSelect={() => {
                                                            onChangeGroup(index, g.id as number);
                                                            setOpenRow(null);
                                                        }}
                                                    >
                                                        <span className="truncate">{g.name}</span>
                                                        <Check className={cn('ml-auto h-4 w-4', g.id === row.groupId ? 'opacity-100' : 'opacity-0')} aria-hidden="true" />
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>

                            {group?.id != null && (
                                <div className="w-full sm:w-48">
                                    <CategoryValueCombobox
                                        groupId={group.id}
                                        value={row.value}
                                        placeholder={t('transactions.filters.selectValue')}
                                        onChange={(value) => onChangeValue(index, value)}
                                    />
                                </div>
                            )}

                            <button
                                type="button"
                                onClick={() => onRemoveRow(index)}
                                className="shrink-0 text-[#9A9AA3] transition-colors hover:text-[#B12C4C]"
                                aria-label={t('transactions.filters.removeCategoryGroup')}
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    );
                })}

                {groups.length > 0 && (
                    <button
                        type="button"
                        onClick={onAddRow}
                        className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-dashed border-[#C7A2E3] px-3.5 text-[13.5px] font-semibold text-[#7E3FB4] transition-colors hover:bg-[#F3EAFB]"
                    >
                        <Plus className="h-4 w-4" />
                        {t('transactions.filters.addCategoryGroup')}
                    </button>
                )}
            </div>
        </div>
    );
};

function ChevronIcon() {
    return (
        <svg
            className="h-4 w-4 shrink-0 text-[#666]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d="m6 9 6 6 6-6" />
        </svg>
    );
}

export default TransactionCategoryFilter;
