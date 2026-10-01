import { CategoryGroupResponse } from '@hopps/api-client';
import { Pencil, Plus, Tag, Trash2 } from 'lucide-react';
import { FC } from 'react';
import { useTranslation } from 'react-i18next';

import { RequiredBadge } from './CategoryGroupSetup';

import { useCategoryGroupValues } from '@/hooks/queries/useCategoryGroups';
import { useBommelsStore } from '@/store/bommels/bommelsStore';

type CategoryGroupCardProps = {
    group: CategoryGroupResponse;
    rootId: number | undefined;
    onEdit: () => void;
    onDelete: () => void;
};

/** How many categories a card shows before summing up the rest; large groups (a chart of accounts) stay compact. */
const MAX_CHIPS = 12;

const sectionLabel = 'mb-2 text-[11.5px] font-bold uppercase tracking-[0.08em] text-[var(--ink-faint)]';

/** One category group in the overview: name, required badge, the bommels it applies to and its categories. */
const CategoryGroupCard: FC<CategoryGroupCardProps> = ({ group, rootId, onEdit, onDelete }) => {
    const { t } = useTranslation();
    const allBommels = useBommelsStore((s) => s.allBommels);
    const { data: values } = useCategoryGroupValues(group.id, '');

    const valueCount = group.valueCount ?? 0;
    const shown = (values?.items ?? []).slice(0, MAX_CHIPS);
    const bommelIds = group.bommelIds ?? [];
    const bommelName = (id: number) => allBommels.find((b) => b.id === id)?.name ?? `#${id}`;

    return (
        <div className="flex flex-col gap-3.5 rounded-[var(--r-card)] border border-[var(--border-soft)] bg-[var(--background-secondary)] px-5 py-[18px]">
            <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[13px] bg-[var(--accent-surface)] text-purple-700">
                        <Tag size={19} />
                    </span>
                    <div className="min-w-0">
                        <div className="truncate text-[15.5px] font-extrabold text-[var(--font-color)]">{group.name}</div>
                        <div className="mt-1 flex items-center gap-[9px]">
                            <RequiredBadge required={!!group.required} />
                            <span className="text-[12.5px] text-[var(--muted)]">{t('categoryGroups.card.valueCount', { count: valueCount })}</span>
                        </div>
                    </div>
                </div>
                <div className="flex shrink-0 gap-1">
                    <button
                        type="button"
                        onClick={onEdit}
                        aria-label={t('common.edit')}
                        className="grid rounded-lg p-1 text-[var(--muted)] hover:bg-[var(--surface-track)]"
                    >
                        <Pencil size={16} />
                    </button>
                    <button
                        type="button"
                        onClick={onDelete}
                        aria-label={t('common.delete')}
                        className="grid rounded-lg p-1 text-[var(--muted)] hover:bg-[var(--negative-surface)] hover:text-[var(--negative)]"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>

            <div className="border-t border-[var(--border-soft)] pt-3">
                <div className={sectionLabel}>{t('categoryGroups.card.appliesTo')}</div>
                {bommelIds.length === 0 ? (
                    <div className="text-sm text-[var(--muted)]">{t('categoryGroups.card.noBommel')}</div>
                ) : rootId != null && bommelIds.includes(rootId) ? (
                    <span className="inline-flex rounded-full bg-[var(--accent-surface)] px-2.5 py-1 dark:border dark:border-[var(--purple-300)] dark:bg-[var(--accent-surface-strong)] text-[12.5px] font-bold text-purple-700">
                        {t('categoryGroups.card.allBommel')}
                    </span>
                ) : (
                    <div className="flex flex-wrap gap-[7px]">
                        {bommelIds.map((id) => (
                            <span
                                key={id}
                                className="inline-flex rounded-full bg-[var(--accent-surface)] px-2.5 py-1 dark:border dark:border-[var(--purple-300)] dark:bg-[var(--accent-surface-strong)] text-[12.5px] font-bold text-purple-700"
                            >
                                {bommelName(id)}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            <div>
                <div className={sectionLabel}>{t('categoryGroups.card.values')}</div>
                <div className="flex flex-wrap gap-[7px]">
                    {shown.map((item) => (
                        <span
                            key={item.id}
                            className="inline-flex items-center rounded-[var(--r-sm)] border border-[var(--border-soft)] dark:border-white px-[11px] py-[5px] text-[13px] font-semibold text-[var(--font-color)]"
                        >
                            {item.value}
                        </span>
                    ))}
                    {valueCount > shown.length && shown.length > 0 && (
                        <span className="inline-flex items-center px-1 py-[5px] text-[13px] font-semibold text-[var(--muted)]">
                            {t('categoryGroups.setup.moreValues', { count: valueCount - shown.length })}
                        </span>
                    )}
                    <button
                        type="button"
                        onClick={onEdit}
                        className="inline-flex items-center gap-[5px] rounded-[var(--r-sm)] border-[1.5px] border-dashed border-[var(--border-soft)] px-[11px] py-[5px] text-[13px] font-bold text-purple-700 hover:bg-[var(--accent-surface)]"
                    >
                        <Plus size={14} />
                        {t('categoryGroups.card.addValue')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CategoryGroupCard;
