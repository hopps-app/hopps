import { Plus, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { SplitPartRow } from './SplitPartRow';
import { SumBar } from './SumBar';
import type { SplitEditorState } from './useSplitEditor';

import { Eyebrow } from '@/components/Transactions/Eyebrow';
import { BaseButton } from '@/components/ui/shadecn/BaseButton';
import { useCurrency } from '@/hooks/use-currency';
import { segmentColor, type SplitPart } from '@/lib/splitParts';

/**
 * The split of a receipt inside the review form, in place of the single bommel and category fields: how much of the
 * amount is assigned, one row per part (own amount, bommel and category values) and a button for another part.
 * `onCancel` offers to go back to a single booking; `onSinglePart` gets the remaining part when removing parts leaves
 * only one, so the form can go back to a single booking by itself.
 */
export function SplitEditor({
    editor,
    total,
    onCancel,
    onSinglePart,
}: {
    editor: SplitEditorState;
    total: number;
    onCancel?: () => void;
    onSinglePart?: (part: SplitPart) => void;
}) {
    const { t } = useTranslation();
    const { format } = useCurrency();
    const { sum, perPart, hasTotal } = editor;

    return (
        <div className="flex flex-col gap-2.5" data-testid="split-editor">
            <div className="flex items-center justify-between gap-3">
                <Eyebrow>{t('receipts.split.section')}</Eyebrow>
                {onCancel && (
                    <button
                        type="button"
                        onClick={onCancel}
                        className="inline-flex items-center gap-1 text-[12.5px] font-bold text-muted-foreground transition-colors hover:text-foreground"
                    >
                        <X size={14} />
                        {t('receipts.split.cancel')}
                    </button>
                )}
            </div>
            <SumBar
                value={format(sum.assigned)}
                total={t('receipts.split.of', { total: format(total) })}
                ok={!sum.over && sum.unassigned === 0 && hasTotal}
                tone={sum.over ? 'warn' : 'neutral'}
                message={
                    sum.over
                        ? t('receipts.split.over', { amount: format(-sum.diff) })
                        : sum.unassigned > 0
                          ? t('receipts.split.unassigned', { amount: format(sum.unassigned) })
                          : t('receipts.split.sumOk')
                }
                segments={perPart.map((x) => ({
                    key: x.part.key,
                    value: x.amount,
                    color: segmentColor(x.index),
                    title: `${editor.nameOf(x.part, x.index)}: ${format(x.amount)}`,
                }))}
            />
            {perPart.map((x) => (
                <SplitPartRow
                    key={x.part.key}
                    part={x.part}
                    index={x.index}
                    amount={x.amount}
                    groups={x.groups}
                    missing={x.errors}
                    errors={x.visible}
                    bommelItems={editor.bommelItems}
                    bommelName={editor.bommelNameOf(x.part.bommelId)}
                    onAmountChange={(v) => editor.setAmount(x.part.key, v)}
                    onBommelChange={(id) => editor.setBommel(x.part.key, id)}
                    onCategoryChange={(groupId, value) => editor.setCategory(x.part.key, groupId, value)}
                    onTouch={(field) => editor.touch(x.part.key, field)}
                    onRemove={() => {
                        const remaining = editor.parts.filter((p) => p.key !== x.part.key);
                        editor.remove(x.part.key);
                        if (remaining.length === 1) onSinglePart?.(remaining[0]);
                    }}
                />
            ))}
            <BaseButton
                variant="outline"
                onClick={editor.add}
                className="h-[42px] w-full gap-2 rounded-[var(--btn-radius)] border-border-soft bg-[var(--background-secondary)] text-[14px] font-bold shadow-none hover:shadow-none"
            >
                <Plus size={16} />
                {t('receipts.split.addPart')}
            </BaseButton>
        </div>
    );
}
