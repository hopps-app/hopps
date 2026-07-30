import { CategoryGroupResponse } from '@hopps/api-client';
import { Plus, X } from 'lucide-react';
import { FC, useState } from 'react';
import { useTranslation } from 'react-i18next';

import CategoryValueCombobox from '@/components/CategoryGroups/CategoryValueCombobox';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/Command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/shadecn/Popover';

type TransactionCategoryFilterProps = {
    /** All category groups of the organization (lightweight list). */
    groups: CategoryGroupResponse[];
    /** Ids of the groups the user has consciously added to the filter — only these show a value picker. */
    shownGroupIds: number[];
    /** groupId → currently selected filter value (absent/empty = the group is shown but not yet filtering). */
    values: Record<number, string>;
    onAddGroup: (groupId: number) => void;
    onRemoveGroup: (groupId: number) => void;
    onChangeValue: (groupId: number, value: string | undefined) => void;
};

/**
 * Minimalist category-group filter for the transactions view. Rather than surfacing every group at once (there can be
 * hundreds — a whole chart of accounts), the user deliberately picks which groups appear here; each chosen group then
 * gets a searchable, server-backed value picker. Multiple groups combine with AND upstream.
 */
const TransactionCategoryFilter: FC<TransactionCategoryFilterProps> = ({ groups, shownGroupIds, values, onAddGroup, onRemoveGroup, onChangeValue }) => {
    const { t } = useTranslation();
    const [addOpen, setAddOpen] = useState(false);

    const shownGroups = shownGroupIds.map((id) => groups.find((g) => g.id === id)).filter((g): g is CategoryGroupResponse => g != null);
    const available = groups.filter((g) => g.id != null && !shownGroupIds.includes(g.id));

    return (
        <div className="col-span-full flex flex-col gap-2">
            <label className="text-[11px] font-bold text-[#9A9AA3] uppercase tracking-[0.06em]">{t('transactions.filters.categoryGroups')}</label>
            <div className="flex flex-wrap items-start gap-2.5">
                {shownGroups.map((group) => (
                    <div key={group.id} className="flex flex-col gap-1 w-full sm:w-56">
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-[12px] font-semibold text-[#6B6B76] truncate">{group.name}</span>
                            <button
                                type="button"
                                onClick={() => onRemoveGroup(group.id as number)}
                                className="text-[#9A9AA3] hover:text-[#B12C4C] transition-colors shrink-0"
                                aria-label={t('transactions.filters.removeCategoryGroup')}
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        </div>
                        <CategoryValueCombobox
                            groupId={group.id as number}
                            value={values[group.id as number]}
                            onChange={(value) => onChangeValue(group.id as number, value)}
                        />
                    </div>
                ))}

                {available.length > 0 && (
                    <Popover open={addOpen} onOpenChange={setAddOpen}>
                        <PopoverTrigger asChild>
                            <button
                                type="button"
                                className="inline-flex items-center gap-1.5 h-10 px-3 rounded-[10px] border border-dashed border-[#C7A2E3] text-[13px] font-semibold text-[#7E3FB4] hover:bg-[#F3EAFB] transition-colors self-end"
                            >
                                <Plus className="h-4 w-4" />
                                {t('transactions.filters.addCategoryGroup')}
                            </button>
                        </PopoverTrigger>
                        <PopoverContent className="z-[110] w-56 p-0" align="start">
                            <Command>
                                <CommandInput placeholder={t('common.search')} className="h-9" />
                                <CommandList>
                                    <CommandEmpty>{t('categoryGroups.fields.noValues')}</CommandEmpty>
                                    <CommandGroup>
                                        {available.map((group) => (
                                            <CommandItem
                                                key={group.id}
                                                value={group.name}
                                                onSelect={() => {
                                                    onAddGroup(group.id as number);
                                                    setAddOpen(false);
                                                }}
                                            >
                                                {group.name}
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                )}
            </div>
        </div>
    );
};

export default TransactionCategoryFilter;
