import { Tag } from 'lucide-react';
import { FC, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import CategoryValueCombobox from './CategoryValueCombobox';
import { buildBommelIndex, groupsForBommel } from './helpers';

import { useCategoryGroups } from '@/hooks/queries/useCategoryGroups';
import { useBommelsStore } from '@/store/bommels/bommelsStore';

type CategoryGroupFieldsProps = {
    bommelId: number | null | undefined;
    values: Record<number, string>;
    onChange: (groupId: number, value: string | undefined) => void;
};

/**
 * Renders a value picker for every category group applicable to the selected bommel (assigned to it or an ancestor).
 * Renders nothing when no group applies. Required groups without a value get a warn-coloured border (no inline error).
 */
const CategoryGroupFields: FC<CategoryGroupFieldsProps> = ({ bommelId, values, onChange }) => {
    const { t } = useTranslation();
    const { data: groups = [] } = useCategoryGroups();
    const allBommels = useBommelsStore((s) => s.allBommels);

    const applicable = useMemo(() => {
        const byId = buildBommelIndex(allBommels);
        return groupsForBommel(groups, bommelId, byId);
    }, [groups, bommelId, allBommels]);

    if (applicable.length === 0) {
        return null;
    }

    return (
        <div className="flex flex-col gap-3 border-t border-[#E9E9EE] pt-4">
            <div className="flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5 text-[#7E3FB4]" />
                <span className="text-[11px] font-bold uppercase tracking-[0.07em] text-[#7E3FB4]">{t('categoryGroups.fields.eyebrow')}</span>
            </div>
            {applicable.map((group) => {
                const groupId = group.id as number;
                const value = values[groupId];
                const warn = !!group.required && (value == null || value.trim() === '');
                return (
                    <div key={groupId} className="grid gap-1.5">
                        <label className="flex items-center gap-2 text-sm font-medium text-[var(--font-color)]">
                            {group.name}
                            {group.required ? (
                                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#FBF1DD] text-[#B47C18]">
                                    {t('categoryGroups.required')}
                                </span>
                            ) : (
                                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#F1F1F4] text-[#6B6B76]">
                                    {t('categoryGroups.optional')}
                                </span>
                            )}
                        </label>
                        <CategoryValueCombobox groupId={groupId} value={value} warn={warn} onChange={(v) => onChange(groupId, v)} />
                    </div>
                );
            })}
        </div>
    );
};

export default CategoryGroupFields;
