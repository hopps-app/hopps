import { ChevronDown, Trash2 } from 'lucide-react';
import { useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import CategoryValueCombobox from '@/components/CategoryGroups/CategoryValueCombobox';
import { ALL_BOMMELS, BommelSelect } from '@/components/Dashboard/BommelSelect';
import type { BommelTreeItem } from '@/components/Dashboard/bommelTree';
import { inputCls } from '@/components/Transactions/drawerParts';
import { formatPartAmount, type SplitFieldId, type SplitGroup, type SplitPart, type SplitPartError, segmentColor } from '@/lib/splitParts';
import { cn } from '@/lib/utils';

const MINI_LABEL = 'flex h-4 items-center gap-1.5 whitespace-nowrap text-[11.5px] font-bold text-muted-foreground';
const WARN_RING = { borderColor: 'var(--warning)', boxShadow: '0 0 0 3px color-mix(in oklch, var(--warning) 18%, transparent)' } as const;

/** Numbered badge of a part, in the colour of its bar segment. */
export function PartBadge({ index, colored = true }: { index: number; colored?: boolean }) {
    return (
        <span
            className="grid h-[22px] w-[22px] flex-shrink-0 place-items-center rounded-[7px] text-[11.5px] font-extrabold"
            style={colored ? { background: segmentColor(index), color: '#fff' } : { background: 'var(--accent-surface)', color: 'var(--purple-700)' }}
        >
            {index + 1}
        </span>
    );
}

/**
 * One part of the split as a row: number, bommel and category fields side by side (horizontally scrollable), the
 * amount fixed on the right and a remove button. The chevron unfolds the row into a card with the same fields in two
 * columns and inline error texts.
 */
export function SplitPartRow({
    part,
    index,
    amount,
    groups,
    errors,
    bommelItems,
    bommelName,
    onAmountChange,
    onBommelChange,
    onCategoryChange,
    onTouch,
    onRemove,
}: {
    part: SplitPart;
    index: number;
    // The effective amount (derived for the rest part).
    amount: number;
    groups: SplitGroup[];
    // The errors to show (already filtered by touched/attempted).
    errors: SplitPartError[];
    bommelItems: BommelTreeItem[];
    bommelName: string | null;
    onAmountChange: (value: string) => void;
    onBommelChange: (bommelId: number | null) => void;
    onCategoryChange: (groupId: number, value: string | undefined) => void;
    onTouch: (field: SplitFieldId) => void;
    onRemove: () => void;
}) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const scroller = useRef<HTMLDivElement>(null);
    const [edge, setEdge] = useState({ left: false, right: false });

    // Fade edges show that more fields are hidden to the left/right of the scroll area.
    useLayoutEffect(() => {
        const el = scroller.current;
        if (!el) return;
        const measure = () => {
            const left = el.scrollLeft > 2;
            const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 2;
            setEdge((e) => (e.left === left && e.right === right ? e : { left, right }));
        };
        measure();
        el.addEventListener('scroll', measure);
        // jsdom (tests) has no ResizeObserver; the scroll listener alone is enough there.
        const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
        observer?.observe(el);
        return () => {
            el.removeEventListener('scroll', measure);
            observer?.disconnect();
        };
    }, [open, part.bommelId, groups.length]);

    const bad = (field: SplitFieldId) => errors.some((e) => e.field === field);
    const summary = [bommelName ?? t('receipts.split.noBommel'), ...groups.map((g) => part.categoryValues[g.id]).filter(Boolean)].join(' · ');

    const bommelSelect = (
        <BommelSelect
            items={bommelItems}
            value={part.bommelId ?? ALL_BOMMELS}
            emptyLabel={t('receipts.split.chooseBommel')}
            onChange={(next) => {
                onBommelChange(next === ALL_BOMMELS ? null : Number(next));
                onTouch('bommel');
            }}
            triggerClassName={cn('w-full sm:w-full rounded-xl border-border-soft shadow-none hover:shadow-none', bad('bommel') && 'border-[var(--warning)]')}
            matchTriggerWidth
        />
    );

    const categoryField = (g: SplitGroup) => (
        <CategoryValueCombobox
            groupId={g.id}
            value={part.categoryValues[g.id]}
            warn={bad(`group:${g.id}`)}
            placeholder={g.required ? t('receipts.split.pleaseChoose') : undefined}
            onChange={(v) => {
                onCategoryChange(g.id, v);
                if (g.required) onTouch(`group:${g.id}`);
            }}
        />
    );

    const requiredTag = <span className="text-[11px] font-bold text-[var(--ink-faint)]">{t('categoryGroups.required')}</span>;
    const errorLine = (text: string) => <span className="text-[12px] font-semibold text-[var(--warning)]">{text}</span>;

    return (
        <div className="rounded-[14px] border border-border-soft" style={{ background: 'var(--background-secondary)' }}>
            <div className="grid items-start gap-2 px-2 py-2.5" style={{ gridTemplateColumns: '20px 22px minmax(0,1fr) 118px 34px' }}>
                <button
                    type="button"
                    onClick={() => setOpen((o) => !o)}
                    aria-expanded={open}
                    aria-label={open ? t('receipts.split.collapse') : t('receipts.split.expand')}
                    title={open ? t('receipts.split.collapse') : t('receipts.split.expand')}
                    className="mt-5 grid h-10 w-5 place-items-center text-muted-foreground"
                >
                    <span className="grid transition-transform duration-150" style={{ transform: open ? 'none' : 'rotate(-90deg)' }}>
                        <ChevronDown size={16} />
                    </span>
                </button>
                <div className="mt-5 grid h-10 place-items-center">
                    <PartBadge index={index} />
                </div>

                {open ? (
                    <div className="flex min-w-0 flex-col gap-1">
                        <span className={MINI_LABEL}>{t('receipts.split.part', { n: index + 1 })}</span>
                        <div className="flex h-10 items-center truncate text-[13.5px] font-bold text-foreground">{summary}</div>
                    </div>
                ) : (
                    <div className="relative min-w-0">
                        <div
                            ref={scroller}
                            className="flex min-w-0 gap-2 overflow-x-auto"
                            style={{ scrollbarWidth: 'thin', paddingBottom: edge.left || edge.right ? 10 : 0 }}
                        >
                            <div className="flex w-[150px] flex-shrink-0 flex-col gap-1">
                                <span className={MINI_LABEL}>{t('receipts.split.bommel')}</span>
                                {bommelSelect}
                            </div>
                            {groups.map((g) => (
                                <div key={g.id} className="flex w-[160px] flex-shrink-0 flex-col gap-1">
                                    <span className={MINI_LABEL}>
                                        <span className="truncate">{g.name}</span>
                                        {g.required && requiredTag}
                                    </span>
                                    {categoryField(g)}
                                </div>
                            ))}
                        </div>
                        {edge.left && (
                            <div
                                className="pointer-events-none absolute bottom-[10px] left-0 top-0 w-[22px]"
                                style={{ background: 'linear-gradient(90deg, var(--background-secondary), transparent)' }}
                            />
                        )}
                        {edge.right && (
                            <div
                                className="pointer-events-none absolute bottom-[10px] right-0 top-0 w-[28px]"
                                style={{ background: 'linear-gradient(270deg, var(--background-secondary), transparent)' }}
                            />
                        )}
                    </div>
                )}

                <div className="flex flex-col gap-1 self-stretch border-l border-border-soft pl-3">
                    <span className={cn(MINI_LABEL, 'justify-end')}>{t('receipts.split.amount')}</span>
                    <input
                        type="text"
                        inputMode="decimal"
                        aria-label={t('receipts.split.amount')}
                        value={part.rest ? formatPartAmount(amount) : part.amount}
                        onChange={(e) => onAmountChange(e.target.value)}
                        onBlur={() => onTouch('amount')}
                        className={cn(inputCls, 'text-right tabular-nums')}
                        style={bad('amount') ? WARN_RING : undefined}
                    />
                </div>
                <button
                    type="button"
                    onClick={onRemove}
                    title={t('receipts.split.removePart')}
                    aria-label={t('receipts.split.removePart')}
                    className="mt-[23px] grid h-[34px] w-[34px] place-items-center rounded-[11px] border border-border-soft text-muted-foreground transition-colors hover:border-[var(--negative)] hover:text-[var(--negative)]"
                    style={{ background: 'var(--background-secondary)' }}
                >
                    <Trash2 size={15} />
                </button>
            </div>

            {open && (
                <div
                    className="grid items-start gap-3.5 border-t border-border-soft px-3.5 pb-4 pt-3.5"
                    style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)' }}
                >
                    <div className="flex flex-col gap-1.5">
                        <span className={MINI_LABEL}>
                            {t('receipts.split.bommel')}
                            {requiredTag}
                        </span>
                        {bommelSelect}
                        {bad('bommel') && errorLine(t('receipts.split.pleaseChoose'))}
                    </div>
                    <div className="flex flex-col gap-2.5">
                        {part.bommelId == null ? (
                            <>
                                <span className={MINI_LABEL}>{t('receipts.split.categories')}</span>
                                <div
                                    className="rounded-[12px] px-3 py-2.5 text-[12.5px] font-semibold text-muted-foreground"
                                    style={{ background: 'var(--surface-sunken)' }}
                                >
                                    {t('receipts.split.chooseFirstBommel')}
                                </div>
                            </>
                        ) : groups.length === 0 ? (
                            <>
                                <span className={MINI_LABEL}>{t('receipts.split.categories')}</span>
                                <div
                                    className="rounded-[12px] px-3 py-2.5 text-[12.5px] font-semibold text-muted-foreground"
                                    style={{ background: 'var(--surface-sunken)' }}
                                >
                                    {t('receipts.split.noGroups')}
                                </div>
                            </>
                        ) : (
                            groups.map((g) => (
                                <div key={g.id} className="flex flex-col gap-1.5">
                                    <span className={MINI_LABEL}>
                                        <span className="truncate">{g.name}</span>
                                        {g.required && requiredTag}
                                    </span>
                                    {categoryField(g)}
                                    {bad(`group:${g.id}`) && errorLine(t('receipts.split.pleaseChoose'))}
                                </div>
                            ))
                        )}
                    </div>
                    {bad('amount') && <div className="col-span-2">{errorLine(t('receipts.split.amountPositive'))}</div>}
                </div>
            )}
        </div>
    );
}
