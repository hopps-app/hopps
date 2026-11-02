import { Bommel } from '@hopps/api-client';
import { Check, ChevronDown, ChevronUp, Search, X } from 'lucide-react';
import { FC, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import Emoji from '@/components/ui/Emoji';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/shadecn/Popover';
import { cn } from '@/lib/utils';
import { useBommelsStore } from '@/store/bommels/bommelsStore';

type BommelMultiSelectorProps = {
    value: number[];
    onChange: (ids: number[]) => void;
    disabled?: boolean;
    /** Only these bommels can be picked (e.g. those a category group applies to); omit for all. */
    allowedIds?: Set<number>;
    placeholder?: string;
    /** Shown in the list when nothing can be picked. */
    emptyText?: string;
};

type Row = { bommel: Bommel; depth: number };

/** The bommels in tree order (depth first from the root), each with its depth for indenting. */
function treeRows(bommels: Bommel[]): Row[] {
    const children = new Map<number | null, Bommel[]>();
    for (const b of bommels) {
        const parentId = b.parent?.id ?? null;
        children.set(parentId, [...(children.get(parentId) ?? []), b]);
    }
    const rows: Row[] = [];
    const seen = new Set<number>();
    const walk = (parentId: number | null, depth: number) => {
        for (const b of children.get(parentId) ?? []) {
            if (b.id == null || seen.has(b.id)) continue;
            seen.add(b.id);
            rows.push({ bommel: b, depth });
            walk(b.id, depth + 1);
        }
    };
    walk(null, 0);
    return rows;
}

/**
 * Multi-select for bommels (category group dialog, reports filter): a search field that opens the bommel tree with
 * checkboxes, and the chosen bommels as removable chips below it. An empty selection means no bommel.
 */
const BommelMultiSelector: FC<BommelMultiSelectorProps> = ({ value, onChange, disabled, allowedIds, placeholder, emptyText }) => {
    const { t } = useTranslation();
    const allBommels = useBommelsStore((s) => s.allBommels);
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const ref = useRef<HTMLDivElement>(null);

    const rows = useMemo(() => {
        const all = treeRows(allBommels);
        if (!allowedIds) return all;
        const allowed = all.filter((r) => r.bommel.id != null && allowedIds.has(r.bommel.id));
        // Indent relative to the highest allowed bommel, so a restricted list does not start deep inside.
        const minDepth = Math.min(...allowed.map((r) => r.depth));
        return allowed.map((r) => ({ ...r, depth: r.depth - minDepth }));
    }, [allBommels, allowedIds]);
    const visible = useMemo(() => {
        const q = query.trim().toLowerCase();
        return q ? rows.filter((r) => (r.bommel.name ?? '').toLowerCase().includes(q)) : rows;
    }, [rows, query]);
    const selected = useMemo(() => rows.filter((r) => r.bommel.id != null && value.includes(r.bommel.id)), [rows, value]);

    const toggle = (id: number) => onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);

    return (
        <div ref={ref}>
            {/* The list is portaled and anchored to the field: it opens over the chips, and a scrolling dialog cannot clip it. */}
            <Popover open={open && !disabled} onOpenChange={setOpen}>
                <PopoverAnchor asChild>
                    <div
                        className={cn(
                            'flex h-10 items-center gap-2.5 rounded-xl border bg-white pl-3 pr-3 transition-colors dark:bg-[var(--purple-50)]',
                            open ? 'border-[var(--purple-300)] ring-2 ring-[var(--purple-50)]' : 'border-[#E0E0E6] dark:border-gray-700'
                        )}
                    >
                        <Search size={16} className="shrink-0 text-[var(--ink-faint)]" />
                        <input
                            value={query}
                            onChange={(e) => {
                                setQuery(e.target.value);
                                setOpen(!disabled);
                            }}
                            onFocus={() => !disabled && setOpen(true)}
                            disabled={disabled}
                            placeholder={placeholder ?? t('categoryGroups.modal.bommelSearch')}
                            className="min-w-0 flex-1 border-none bg-transparent text-sm text-gray-800 outline-none placeholder:text-muted dark:text-gray-100"
                        />
                        <button
                            type="button"
                            aria-label={open ? t('categoryGroups.modal.bommelClose') : t('categoryGroups.modal.bommelOpen')}
                            onClick={() => setOpen(!open)}
                            disabled={disabled}
                            className="grid text-[var(--muted)] disabled:opacity-50"
                        >
                            {open ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
                        </button>
                    </div>
                </PopoverAnchor>

                {/* z-[110]: sits above dialogs. Focus stays in the search field, and clicks on the field or the chips are not outside. */}
                <PopoverContent
                    align="start"
                    sideOffset={6}
                    onOpenAutoFocus={(e) => e.preventDefault()}
                    onInteractOutside={(e) => {
                        if (ref.current?.contains(e.target as Node)) e.preventDefault();
                    }}
                    // A dialog's scroll lock listens on the document and would swallow the scrolling of this portaled list.
                    onWheel={(e) => e.stopPropagation()}
                    onTouchMove={(e) => e.stopPropagation()}
                    className="z-[110] flex max-h-60 w-[var(--radix-popover-trigger-width)] flex-col gap-0.5 overflow-y-auto rounded-xl border-[var(--border-soft)] bg-[var(--background-secondary)] p-2 shadow-[var(--shadow-lg)]"
                >
                    {visible.map(({ bommel, depth }) => {
                        const on = bommel.id != null && value.includes(bommel.id);
                        return (
                            <button
                                key={bommel.id}
                                type="button"
                                onClick={() => bommel.id != null && toggle(bommel.id)}
                                style={{ paddingLeft: 9 + depth * 16 }}
                                className={cn(
                                    'flex items-center gap-2.5 rounded-[9px] py-[7px] pr-[9px] text-left text-[13.5px] text-[var(--font-color)]',
                                    on ? 'bg-[var(--accent-surface)] font-bold' : 'font-semibold hover:bg-[var(--surface-sunken)]'
                                )}
                            >
                                <span
                                    className={cn(
                                        'grid h-[18px] w-[18px] shrink-0 place-items-center rounded-md border-[1.5px] text-white',
                                        on ? 'border-[var(--primary)] bg-[var(--primary)]' : 'border-[var(--border-soft)] bg-[var(--background-secondary)]'
                                    )}
                                >
                                    {on && <Check size={12} strokeWidth={3} />}
                                </span>
                                {bommel.emoji && <Emoji emoji={bommel.emoji} className="text-sm" />}
                                {bommel.name}
                                {bommel.parent?.id == null && (
                                    <span className="text-[11.5px] font-semibold text-[var(--ink-faint)]">{t('categoryGroups.modal.bommelRoot')}</span>
                                )}
                            </button>
                        );
                    })}
                    {visible.length === 0 && (
                        <div className="px-[9px] py-2 text-[13.5px] text-[var(--ink-faint)]">
                            {rows.length === 0 && emptyText ? emptyText : t('categoryGroups.modal.bommelNone')}
                        </div>
                    )}
                </PopoverContent>
            </Popover>

            {selected.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {selected.map(({ bommel }) => (
                        <span
                            key={bommel.id}
                            className="inline-flex items-center gap-1.5 rounded-[var(--r-sm)] bg-[var(--accent-surface)] py-[5px] dark:border dark:border-[var(--purple-300)] dark:bg-[var(--accent-surface-strong)] pl-[11px] pr-2 text-[13px] font-bold text-purple-700"
                        >
                            {bommel.emoji && <Emoji emoji={bommel.emoji} className="text-sm" />}
                            {bommel.name}
                            {!disabled && (
                                <button
                                    type="button"
                                    aria-label={t('categoryGroups.modal.remove', { name: bommel.name })}
                                    onClick={() => bommel.id != null && toggle(bommel.id)}
                                    className="grid text-inherit"
                                >
                                    <X size={13} />
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
