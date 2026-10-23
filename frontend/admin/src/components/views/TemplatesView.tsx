import { GripVertical, LayoutTemplate, Plus } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import Button from '@/components/ui/Button';
import InfoTip from '@/components/ui/InfoTip';
import { formatDate, formatNumber } from '@/features/organizations/format';
import { fetchTemplates, reorderTemplates } from '@/features/templates/api';
import CategoryGroupTemplateDrawer from '@/features/templates/CategoryGroupTemplateDrawer';
import type { TemplateKind, TemplateRow } from '@/features/templates/types';

/** Header and rows share one grid so the columns line up. */
const GRID = '20px minmax(0,2.4fr) 1.2fr 0.8fr 1fr 0.9fr 0.9fr';

/** Template kinds offered as filters. Grows as the backend gains template types. */
const KINDS: TemplateKind[] = ['CATEGORY_GROUP'];

type Editing = { kind: TemplateKind; id: number | null } | null;

/** Line where the dragged row will land: above the target when moving up, below it when moving down. */
function dropLine(visible: TemplateRow[], dragId: number | null, targetId: number): string {
    const ids = visible.map((r) => r.id);
    return dragId !== null && ids.indexOf(dragId) < ids.indexOf(targetId) ? 'inset 0 -2px 0 var(--pp)' : 'inset 0 2px 0 var(--pp)';
}

/**
 * Moves `dragId` to the position of `targetId` within the visible rows and returns the full list in its new order.
 * Rows hidden by the type filter keep their slots, so reordering one tab never shuffles another.
 */
function reorder(rows: TemplateRow[], visibleIds: number[], dragId: number, targetId: number): TemplateRow[] {
    const ids = visibleIds.filter((id) => id !== dragId);
    ids.splice(ids.indexOf(targetId) + (visibleIds.indexOf(dragId) < visibleIds.indexOf(targetId) ? 1 : 0), 0, dragId);
    const byId = new Map(rows.map((r) => [r.id, r]));
    const visibleSet = new Set(visibleIds);
    let next = 0;
    return rows.map((r) => (visibleSet.has(r.id) ? byId.get(ids[next++])! : r));
}

/**
 * Platform-wide templates that organizations can copy into their own data. Not tied to one feature: every template
 * kind is listed here, and the editor opened for a row depends on its kind.
 */
export default function TemplatesView() {
    const { t } = useTranslation();
    const [rows, setRows] = useState<TemplateRow[] | null>(null);
    const [failed, setFailed] = useState(false);
    const [kind, setKind] = useState<TemplateKind | 'ALL'>('ALL');
    const [editing, setEditing] = useState<Editing>(null);
    const [dragId, setDragId] = useState<number | null>(null);
    const [overId, setOverId] = useState<number | null>(null);
    const [orderFailed, setOrderFailed] = useState(false);

    const load = useCallback(() => {
        fetchTemplates()
            .then((r) => {
                setRows(r);
                setFailed(false);
            })
            .catch((e) => {
                console.error('Failed to load templates:', e);
                setFailed(true);
            });
    }, []);

    useEffect(load, [load]);

    const visible = useMemo(() => (rows && kind !== 'ALL' ? rows.filter((r) => r.type === kind) : rows), [rows, kind]);

    const handleDrop = (targetId: number) => {
        const from = dragId;
        setDragId(null);
        setOverId(null);
        if (!rows || !visible || from === null || from === targetId) return;
        const next = reorder(
            rows,
            visible.map((r) => r.id),
            from,
            targetId
        );
        setRows(next);
        setOrderFailed(false);
        // Optimistic: the list already shows the new order. On failure, reload the saved order and say so.
        reorderTemplates(next.map((r) => r.id)).catch((e) => {
            console.error('Failed to save template order:', e);
            setOrderFailed(true);
            load();
        });
    };

    return (
        <div className="fade-up">
            <div className="flex items-start justify-between gap-5 mb-[22px] flex-wrap">
                <div>
                    <h1 className="inline-flex items-center gap-2 text-[27px] font-extrabold text-ink">
                        {t('templates.title')}
                        <InfoTip text={t('templates.subtitle')} size={17} />
                    </h1>
                </div>
                <Button className="px-4" onClick={() => setEditing({ kind: 'CATEGORY_GROUP', id: null })}>
                    <Plus size={16} />
                    {t('templates.new')}
                </Button>
            </div>

            <div className="mb-3.5">
                <div className="seg" role="tablist" aria-label={t('templates.filterLabel')}>
                    {(['ALL', ...KINDS] as const).map((k) => (
                        <button key={k} type="button" role="tab" aria-selected={kind === k} className={kind === k ? 'on' : ''} onClick={() => setKind(k)}>
                            {k === 'ALL' ? t('templates.filterAll') : t(`templates.types.${k}`)}
                            {rows && <span className="tnum ml-1.5 text-ink-3">{k === 'ALL' ? rows.length : rows.filter((r) => r.type === k).length}</span>}
                        </button>
                    ))}
                </div>
            </div>

            {orderFailed && <p className="text-[13px] text-neg-ink mb-3">{t('templates.orderError')}</p>}

            {failed ? (
                <div className="card card--flat p-10 text-center">
                    <p className="text-[13.5px] text-neg-ink">{t('templates.loadError')}</p>
                </div>
            ) : visible === null ? (
                <div className="flex justify-center py-16">
                    <span className="spinner" />
                </div>
            ) : visible.length === 0 ? (
                <div className="card card--flat px-6 py-14 text-center flex flex-col items-center gap-2">
                    <LayoutTemplate size={30} className="text-ink-3" strokeWidth={1.7} />
                    <p className="text-[15px] font-bold text-ink">{t('templates.emptyTitle')}</p>
                    <p className="text-[13.5px] text-ink-2 max-w-[420px]">{t('templates.emptyText')}</p>
                </div>
            ) : (
                <div className="card overflow-hidden">
                    <div
                        className="grid items-center px-5 py-3.5 uppercase tracking-wider text-xs font-bold text-ink-2"
                        style={{ gridTemplateColumns: GRID, gap: 24, background: 'var(--surface-2)', borderBottom: '1px solid var(--line)' }}
                    >
                        <span className="grid normal-case tracking-normal">
                            <InfoTip text={t('templates.orderHint')} />
                        </span>
                        <span>{t('templates.columns.name')}</span>
                        <span>{t('templates.columns.type')}</span>
                        <span>{t('templates.columns.items')}</span>
                        <span>{t('templates.columns.usage')}</span>
                        <span>{t('templates.columns.updated')}</span>
                        <span>{t('templates.columns.status')}</span>
                    </div>
                    {visible.map((row, i) => (
                        <div
                            key={row.id}
                            className="trow"
                            style={{
                                gridTemplateColumns: GRID,
                                gap: 24,
                                borderBottom: i < visible.length - 1 ? '1px solid var(--line)' : 'none',
                                opacity: dragId === row.id ? 0.4 : 1,
                                boxShadow: overId === row.id && dragId !== row.id ? dropLine(visible, dragId, row.id) : undefined,
                            }}
                            draggable
                            onDragStart={(e) => {
                                setDragId(row.id);
                                e.dataTransfer.effectAllowed = 'move';
                            }}
                            onDragOver={(e) => {
                                if (dragId === null) return;
                                e.preventDefault();
                                setOverId(row.id);
                            }}
                            onDragLeave={() => setOverId((id) => (id === row.id ? null : id))}
                            onDrop={(e) => {
                                e.preventDefault();
                                handleDrop(row.id);
                            }}
                            onDragEnd={() => {
                                setDragId(null);
                                setOverId(null);
                            }}
                            onClick={() => setEditing({ kind: row.type, id: row.id })}
                        >
                            <span
                                className="grid text-ink-3 cursor-grab active:cursor-grabbing"
                                aria-label={t('templates.dragHandle')}
                                title={t('templates.dragHandle')}
                            >
                                <GripVertical size={16} />
                            </span>
                            <div className="min-w-0">
                                <div className="text-[14px] font-bold text-ink truncate">{row.name}</div>
                                {row.description && <div className="text-[12px] text-ink-2 truncate">{row.description}</div>}
                            </div>
                            <span className="text-[13.5px] text-ink-2">{t(`templates.types.${row.type}`)}</span>
                            <span className="tnum text-[13.5px] text-ink-2">{formatNumber(row.itemCount)}</span>
                            <span className="tnum text-[13.5px] text-ink-2">
                                {t('templates.usage', { count: row.usageCount, formatted: formatNumber(row.usageCount) })}
                            </span>
                            <span className="tnum text-[13.5px] text-ink-2">{formatDate(row.updatedAt ?? row.createdAt) ?? ''}</span>
                            <span>
                                <span className={`badge ${row.active ? 'badge--pos' : 'badge--neutral'}`}>
                                    {row.active ? t('templates.status.active') : t('templates.status.inactive')}
                                </span>
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {editing?.kind === 'CATEGORY_GROUP' && <CategoryGroupTemplateDrawer templateId={editing.id} onClose={() => setEditing(null)} onChanged={load} />}
        </div>
    );
}
