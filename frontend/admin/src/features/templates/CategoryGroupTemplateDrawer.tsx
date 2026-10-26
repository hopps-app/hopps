import { Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { deleteTemplate, fetchCategoryGroupTemplate, saveCategoryGroupTemplate } from './api';
import TemplateValuesEditor from './TemplateValuesEditor';
import type { CategoryGroupTemplate } from './types';

import Button from '@/components/ui/Button';
import InfoTip from '@/components/ui/InfoTip';

type CategoryGroupTemplateDrawerProps = {
    /** The template to edit, or null to create a new one. */
    templateId: number | null;
    onClose: () => void;
    /** Called after a save or delete so the list can reload. */
    onChanged: () => void;
};

const EMPTY: CategoryGroupTemplate = {
    id: null,
    name: '',
    description: '',
    active: true,
    required: false,
    values: [],
    usageCount: 0,
};

/**
 * Side drawer to create or edit a category group template: group name, values and the required flag, plus the
 * admin-only description, active flag and order.
 */
export default function CategoryGroupTemplateDrawer({ templateId, onClose, onChanged }: CategoryGroupTemplateDrawerProps) {
    const { t } = useTranslation();
    const [template, setTemplate] = useState<CategoryGroupTemplate | null>(templateId === null ? EMPTY : null);
    const [loadFailed, setLoadFailed] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [confirmDelete, setConfirmDelete] = useState(false);

    useEffect(() => {
        if (templateId === null) return;
        let cancelled = false;
        fetchCategoryGroupTemplate(templateId)
            .then((loaded) => {
                if (cancelled) return;
                setTemplate(loaded);
            })
            .catch((e) => {
                console.error('Failed to load template:', e);
                if (!cancelled) setLoadFailed(true);
            });
        return () => {
            cancelled = true;
        };
    }, [templateId]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !busy && onClose();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose, busy]);

    const canSave = !!template && template.name.trim() !== '' && !busy;

    const update = (patch: Partial<CategoryGroupTemplate>) => setTemplate((prev) => (prev ? { ...prev, ...patch } : prev));

    const handleSave = async () => {
        if (!template || !canSave) return;
        setBusy(true);
        setError(null);
        try {
            await saveCategoryGroupTemplate({ ...template, name: template.name.trim() });
            onChanged();
            onClose();
        } catch (e) {
            console.error('Failed to save template:', e);
            setError(t('templates.editor.saveError'));
            setBusy(false);
        }
    };

    const handleDelete = async () => {
        if (!template?.id) return;
        setBusy(true);
        setError(null);
        try {
            await deleteTemplate(template.id);
            onChanged();
            onClose();
        } catch (e) {
            console.error('Failed to delete template:', e);
            setError(t('templates.editor.deleteError'));
            setBusy(false);
        }
    };

    const isNew = templateId === null;

    return (
        <>
            <div className="scrim" onClick={() => !busy && onClose()} />
            <aside className="drawer" role="dialog" aria-modal="true">
                <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4">
                    <div className="min-w-0">
                        <div className="eyebrow">{t('templates.types.CATEGORY_GROUP')}</div>
                        <h2 className="text-[21px] font-extrabold text-ink mt-1 truncate">
                            {isNew ? t('templates.editor.newTitle') : template?.name || t('templates.editor.editTitle')}
                        </h2>
                    </div>
                    <button type="button" className="icbtn" aria-label={t('common.close')} disabled={busy} onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>

                {loadFailed ? (
                    <p className="px-6 text-[13.5px] text-neg-ink">{t('templates.editor.loadError')}</p>
                ) : !template ? (
                    <div className="flex justify-center py-16">
                        <span className="spinner" />
                    </div>
                ) : (
                    <div className="flex-1 px-6 pb-6 flex flex-col gap-5">
                        {template.usageCount > 0 && (
                            <p className="text-[13px] text-ink-2 leading-relaxed card card--flat px-4 py-3">
                                {t('templates.editor.usageNote', { count: template.usageCount })}
                            </p>
                        )}

                        <Field label={t('templates.editor.name')}>
                            <input
                                className="input"
                                value={template.name}
                                autoFocus={isNew}
                                disabled={busy}
                                placeholder={t('templates.editor.namePlaceholder')}
                                onChange={(e) => update({ name: e.target.value })}
                            />
                        </Field>

                        <TemplateValuesEditor values={template.values} disabled={busy} onChange={(values) => update({ values })} />

                        <Field label={t('templates.editor.description')} info={t('templates.editor.descriptionHint')}>
                            <textarea
                                className="input min-h-[76px] py-2.5"
                                value={template.description}
                                disabled={busy}
                                onChange={(e) => update({ description: e.target.value })}
                            />
                        </Field>

                        <Toggle
                            checked={template.required}
                            disabled={busy}
                            label={t('templates.editor.required')}
                            hint={t('templates.editor.requiredHint')}
                            onChange={(required) => update({ required })}
                        />
                        <Toggle
                            checked={template.active}
                            disabled={busy}
                            label={t('templates.editor.active')}
                            hint={t('templates.editor.activeHint')}
                            onChange={(active) => update({ active })}
                        />
                    </div>
                )}

                {template && (
                    <div
                        className="sticky bottom-0 px-6 py-4 flex items-center gap-2.5"
                        style={{ background: 'var(--bg)', borderTop: '1px solid var(--line)' }}
                    >
                        {!isNew &&
                            (confirmDelete ? (
                                <Button variant="destructive" className="px-4" disabled={busy} onClick={handleDelete}>
                                    {t('templates.editor.deleteConfirm')}
                                </Button>
                            ) : (
                                <Button variant="destructive-outline" className="px-4" disabled={busy} onClick={() => setConfirmDelete(true)}>
                                    <Trash2 />
                                    {t('templates.editor.delete')}
                                </Button>
                            ))}
                        {error && <span className="text-[13px] text-neg-ink">{error}</span>}
                        <div className="flex-1" />
                        <Button variant="outline" className="px-4" disabled={busy} onClick={onClose}>
                            {t('common.cancel')}
                        </Button>
                        <Button className="px-4" disabled={!canSave} onClick={handleSave}>
                            {busy ? t('templates.editor.saving') : t('templates.editor.save')}
                        </Button>
                    </div>
                )}
            </aside>
        </>
    );
}

function Field({
    label,
    hint,
    info,
    aside,
    children,
}: {
    label: string;
    hint?: string;
    /** Shown as a tooltip on an info icon next to the label. */
    info?: string;
    aside?: string;
    children: React.ReactNode;
}) {
    return (
        <label className="block">
            <div className="flex items-baseline justify-between gap-3 mb-1.5">
                <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink">
                    {label}
                    {info && <InfoTip text={info} />}
                </span>
                {aside && <span className="tnum text-[12px] text-ink-2">{aside}</span>}
            </div>
            {children}
            {hint && <p className="text-[12px] text-ink-2 mt-1.5">{hint}</p>}
        </label>
    );
}

function Toggle({
    checked,
    disabled,
    label,
    hint,
    onChange,
}: {
    checked: boolean;
    disabled: boolean;
    label: string;
    hint: string;
    onChange: (checked: boolean) => void;
}) {
    return (
        <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" className="h-4 w-4 accent-[var(--pp)]" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
            <span className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-ink">
                {label}
                <InfoTip text={hint} />
            </span>
        </label>
    );
}
