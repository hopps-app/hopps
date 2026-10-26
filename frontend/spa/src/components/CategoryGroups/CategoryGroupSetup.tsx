import { CategoryGroupTemplateDetail, CategoryGroupTemplateOption } from '@hopps/api-client';
import { Check, Plus, Tag } from 'lucide-react';
import { FC, useState } from 'react';
import { useTranslation } from 'react-i18next';

import CategoryGroupModal from './CategoryGroupModal';

import { NextStepCard } from '@/components/common';
import Button from '@/components/ui/Button';
import { useCategoryGroupTemplate } from '@/hooks/queries/useCategoryGroups';
import { cn } from '@/lib/utils';

type CategoryGroupSetupProps = {
    templates: CategoryGroupTemplateOption[];
    onCreated: () => void;
};

/** Selection value of the "no template" tile; template ids are always positive. */
const NONE = 0;

/**
 * First-use screen of the categories page: pick one of the templates maintained in the admin app (or none) and open
 * the group dialog with it. Without any active template only a next-step card with "Gruppe anlegen" is shown.
 */
const CategoryGroupSetup: FC<CategoryGroupSetupProps> = ({ templates, onCreated }) => {
    const { t } = useTranslation();
    const [selected, setSelected] = useState<number>(templates[0]?.id ?? NONE);
    const [modalOpen, setModalOpen] = useState(false);

    const option = templates.find((tpl) => tpl.id === selected);
    // The dialog needs every value of the template, the tile list only has a preview.
    const { data: detail, isFetching } = useCategoryGroupTemplate(option?.id);
    const modalTemplate: CategoryGroupTemplateDetail | undefined = option ? detail : undefined;

    const modal = <CategoryGroupModal open={modalOpen} template={modalTemplate} onClose={() => setModalOpen(false)} onSaved={onCreated} />;

    if (templates.length === 0) {
        return (
            <>
                <NextStepCard
                    icon={Tag}
                    title={t('categoryGroups.setup.noTemplatesTitle')}
                    action={
                        <Button size="sm" className="h-10" onClick={() => setModalOpen(true)}>
                            <Plus />
                            {t('categoryGroups.setup.createGroup')}
                        </Button>
                    }
                />
                {modal}
            </>
        );
    }

    const tiles = [
        ...templates.map((tpl) => ({ id: tpl.id as number, title: tpl.name ?? '', sub: tpl.description ?? '' })),
        { id: NONE, title: t('categoryGroups.setup.noTemplate'), sub: '' },
    ];

    return (
        <div className="grid items-start gap-5 [grid-template-columns:repeat(auto-fit,minmax(320px,1fr))]">
            <div className="flex flex-col gap-2.5">
                <div className="text-[12px] font-bold uppercase tracking-[0.07em] text-purple-700">{t('categoryGroups.setup.templateEyebrow')}</div>
                <div role="radiogroup" aria-label={t('categoryGroups.setup.templateEyebrow')} className="flex flex-col gap-2.5">
                    {tiles.map((tile) => {
                        const on = selected === tile.id;
                        return (
                            <button
                                key={tile.id}
                                type="button"
                                role="radio"
                                aria-checked={on}
                                onClick={() => setSelected(tile.id)}
                                className={cn(
                                    'flex items-start gap-3 rounded-[var(--r-md)] border-[1.5px] px-4 py-3.5 text-left transition-colors',
                                    on ? 'border-[var(--primary)] bg-[var(--accent-surface)]' : 'border-[var(--border-soft)] bg-[var(--background-secondary)]'
                                )}
                            >
                                <span
                                    className={cn(
                                        'mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border-[1.5px]',
                                        on ? 'border-[var(--primary)] bg-[var(--primary)]' : 'border-[var(--border-soft)] bg-[var(--background-secondary)]'
                                    )}
                                >
                                    {on && <span className="h-[7px] w-[7px] rounded-full bg-white" />}
                                </span>
                                <span className="min-w-0">
                                    <span className={cn('block text-[15px] font-extrabold', on ? 'text-purple-700' : 'text-[var(--font-color)]')}>
                                        {tile.title}
                                    </span>
                                    {tile.sub && <span className="mt-0.5 block text-[13px] text-[var(--muted)]">{tile.sub}</span>}
                                </span>
                            </button>
                        );
                    })}
                </div>

                <div className="mt-1 flex gap-2.5">
                    <Button size="sm" className="h-10" disabled={!!option && (isFetching || !detail)} onClick={() => setModalOpen(true)}>
                        {option ? <Check /> : <Plus />}
                        {option ? t('categoryGroups.setup.applyTemplate') : t('categoryGroups.setup.createGroup')}
                    </Button>
                </div>
            </div>

            {/* The preview column stays for "Keine Vorlage" too, so the tiles keep their width when switching. */}
            {/* Same gap as the tile column, so the first tile and the preview card start on one line. */}
            <div className="flex flex-col gap-2.5">
                <div className="text-[12px] font-bold uppercase tracking-[0.07em] text-purple-700">{t('categoryGroups.setup.previewEyebrow')}</div>
                {option ? (
                    <div className="flex flex-col gap-2.5 rounded-[var(--r-card)] border border-[var(--border-soft)] bg-[var(--background-secondary)] px-[18px] py-4">
                        {' '}
                        <div className="flex flex-wrap items-center gap-2.5">
                            {' '}
                            <div className="text-[15px] font-extrabold text-[var(--font-color)]">{option.name}</div>{' '}
                            <RequiredBadge required={!!option.required} />{' '}
                        </div>{' '}
                        <div className="flex flex-wrap gap-[7px]">
                            {' '}
                            {(option.previewValues ?? []).map((value) => (
                                <span
                                    key={value}
                                    className="inline-flex items-center rounded-[var(--r-sm)] border border-[var(--border-soft)] dark:border-white px-[11px] py-[5px] text-[13px] font-semibold text-[var(--font-color)]"
                                >
                                    {' '}
                                    {value}{' '}
                                </span>
                            ))}{' '}
                            {(option.valueCount ?? 0) > (option.previewValues?.length ?? 0) && (
                                <span className="inline-flex items-center px-1 py-[5px] text-[13px] font-semibold text-[var(--muted)]">
                                    {' '}
                                    {t('categoryGroups.setup.moreValues', { count: (option.valueCount ?? 0) - (option.previewValues?.length ?? 0) })}{' '}
                                </span>
                            )}{' '}
                        </div>{' '}
                    </div>
                ) : (
                    <div className="flex flex-col gap-1.5 rounded-[var(--r-card)] border border-[var(--border-soft)] bg-[var(--background-secondary)] px-[18px] py-4">
                        <div className="text-[15px] font-extrabold text-[var(--font-color)]">{t('categoryGroups.setup.ownGroupTitle')}</div>
                        <div className="text-[13.5px] text-[var(--muted)]">{t('categoryGroups.setup.ownGroupText')}</div>
                    </div>
                )}
            </div>

            {modal}
        </div>
    );
};

/** "Pflicht" / "optional" badge used on the template preview and the group cards. */
export const RequiredBadge: FC<{ required: boolean }> = ({ required }) => {
    const { t } = useTranslation();
    return (
        <span
            className={cn(
                'inline-flex items-center rounded-full px-2.5 py-1 text-[12.5px] font-bold',
                required ? 'bg-[var(--warning-surface)] text-[var(--warning)]' : 'bg-[var(--surface-track)] text-[var(--muted)]'
            )}
        >
            {required ? t('categoryGroups.required') : t('categoryGroups.optional')}
        </span>
    );
};

export default CategoryGroupSetup;
