import { ChevronDown, Trash2 } from 'lucide-react';
import { useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import CategoryValueCombobox from '@/components/CategoryGroups/CategoryValueCombobox';
import { ALL_BOMMELS, BommelSelect } from '@/components/Dashboard/BommelSelect';
import type { BommelTreeItem } from '@/components/Dashboard/bommelTree';
import { hideWhileEditingCls, inputCls, pickerFocusCls } from '@/components/Transactions/drawerParts';
import { RequiredTag } from '@/components/ui/RequiredTag';
import { formatPartAmount, type SplitFieldId, type SplitGroup, type SplitPart, type SplitPartError, segmentColor } from '@/lib/splitParts';
import { cn } from '@/lib/utils';

const MINI_LABEL = 'flex h-4 items-center gap-1.5 whitespace-nowrap text-[11.5px] font-bold text-muted-foreground';
// Stronger mark once the missing amount is spelled out; as classes so the focus ring of the input still wins.
const WARN_RING = 'ring-[3px] ring-[color-mix(in_oklch,var(--warning)_18%,transparent)]';

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
 * columns and inline error texts. Parts start unfolded so no category is overlooked; the chevron folds them up.
 */
export function SplitPartRow({
    part,
    index,
    amount,
    groups,
    missing,
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
    // Every field still missing: marked with the orange border right away, like the required fields of the single form.
    missing: SplitPartError[];
    // The errors to explain with a text (already filtered by touched/attempted).
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
    const [open, setOpen] = useState(true);
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

    const empty = (field: SplitFieldId) => missing.some((e) => e.field === field);
    const bad = (field: SplitFieldId) => errors.some((e) => e.field === field);
    const summary = [bommelName ?? t('receipts.split.noBommel'), ...groups.map((g) => part.categoryValues[g.id]).filter(Boolean)].join(' · ');

    // In the compact row the trigger is narrow, so the list opens at its own width instead of matching the trigger;
    // the expanded card has room for both.
    const bommelSelect = (matchTriggerWidth: boolean) => (
        <BommelSelect
            items={bommelItems}
            value={part.bommelId ?? ALL_BOMMELS}
            emptyLabel={t('receipts.split.chooseBommel')}
            onChange={(next) => {
                onBommelChange(next === ALL_BOMMELS ? null : Number(next));
                onTouch('bommel');
            }}
            triggerClassName={cn(
                'w-full sm:w-full rounded-xl border-border-soft shadow-none hover:shadow-none',
                empty('bommel') && 'border-[var(--warning)]',
                pickerFocusCls
            )}
            matchTriggerWidth={matchTriggerWidth}
        />
    );

    const categoryField = (g: SplitGroup) => (
        <CategoryValueCombobox
            groupId={g.id}
            value={part.categoryValues[g.id]}
            warn={empty(`group:${g.id}`)}
            placeholder={g.required ? t('receipts.split.pleaseChoose') : undefined}
            onChange={(v) => {
                onCategoryChange(g.id, v);
                if (g.required) onTouch(`group:${g.id}`);
            }}
        />
    );

    const requiredTag = <RequiredTag />;
    const errorLine = (text: string) => <span className={cn('text-[12px] font-semibold text-[var(--warning)]', hideWhileEditingCls)}>{text}</span>;

    return (
        <div className="rounded-[14px] border border-border-soft" style={{ background: 'var(--background-secondary)' }}>
            <div className="grid items-start gap-2 px-2 py-2.5" style={{ gridTemplateColumns: '20px 22px minmax(0,1fr) 118px 34px' }}>
                <button
                    type="button"
                    onClick={() => setOpen((o) => !o)}
                    aria-expanded={open}
                    aria-label={open ? t('receipts.split.collapse') : t('receipts.split.expand')}
                    title={open ? t('receipts.split.collapse') : t('receipts.split.expand')}
                    className="mt-5 grid h-10 w-5 cursor-pointer place-items-center text-muted-foreground hover:text-foreground"
                >
                    <span className="grid transition-transform duration-150" style={{ transform: open ? 'none' : 'rotate(-90deg)' }}>
                        <ChevronDown size={16} />
                    </span>
                </button>
                {/* The badge toggles too: a bigger target than the chevron alone. Kept out of the tab order, the chevron is the keyboard control. */}
                <button
                    type="button"
                    onClick={() => setOpen((o) => !o)}
                    tabIndex={-1}
                    aria-hidden="true"
                    className="mt-5 grid h-10 cursor-pointer place-items-center"
                >
                    <PartBadge index={index} />
                </button>

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
                            <div className="flex w-[176px] flex-shrink-0 flex-col gap-1">
                                <span className={MINI_LABEL}>{t('receipts.split.bommel')}</span>
                                {bommelSelect(false)}
                            </div>
                            {groups.map((g) => (
                                <div key={g.id} className="flex w-[180px] flex-shrink-0 flex-col gap-1">
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

                <div className="group/field flex flex-col gap-1 self-stretch border-l border-border-soft pl-3">
                    <span className={cn(MINI_LABEL, 'justify-end')}>{t('receipts.split.amount')}</span>
                    <input
                        type="text"
                        inputMode="decimal"
                        aria-label={t('receipts.split.amount')}
                        value={part.rest ? formatPartAmount(amount) : part.amount}
                        onChange={(e) => onAmountChange(e.target.value)}
                        onBlur={() => onTouch('amount')}
                        className={cn(inputCls, 'text-right tabular-nums', empty('amount') && 'border-[var(--warning)]', bad('amount') && WARN_RING)}
                    />
                    {bad('amount') && (
                        <span className={cn('text-right leading-tight', hideWhileEditingCls)}>{errorLine(t('receipts.split.amountRequired'))}</span>
                    )}
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
                    <div className="group/field flex flex-col gap-1.5">
                        <span className={MINI_LABEL}>
                            {t('receipts.split.bommel')}
                            {requiredTag}
                        </span>
                        {bommelSelect(true)}
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
                                <div key={g.id} className="group/field flex flex-col gap-1.5">
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
                </div>
            )}
        </div>
    );
}
