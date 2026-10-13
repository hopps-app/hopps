import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { fmtEUR } from './splitHelpers';

import { buildBommelIndex, groupsForBommel } from '@/components/CategoryGroups/helpers';
import { flattenBommelTree } from '@/components/Dashboard/bommelTree';
import { useCategoryGroups } from '@/hooks/queries/useCategoryGroups';
import {
    addPart,
    autoName,
    partAmount,
    partErrors,
    removePart,
    setPartAmount,
    setPartBommel,
    sumState,
    toPartPayloads,
    visibleErrors,
    type SplitFieldId,
    type SplitGroup,
    type SplitPart,
} from '@/lib/splitParts';
import { useBommelsStore } from '@/store/bommels/bommelsStore';

/** Bommels of the organization with the category groups that apply to each of them. */
export function useSplitLookups() {
    const { data: categoryGroups = [] } = useCategoryGroups();
    const allBommels = useBommelsStore((s) => s.allBommels);
    const bommelIndex = useMemo(() => buildBommelIndex(allBommels), [allBommels]);
    const bommelItems = useMemo(() => flattenBommelTree(allBommels), [allBommels]);
    const groupsFor = useCallback(
        (bommelId: number | null): SplitGroup[] =>
            groupsForBommel(categoryGroups, bommelId, bommelIndex).map((g) => ({ id: g.id as number, name: g.name ?? '', required: !!g.required })),
        [categoryGroups, bommelIndex]
    );
    const bommelNameOf = useCallback(
        (bommelId: number | null | undefined): string | null => (bommelId != null ? (bommelIndex.get(bommelId)?.name ?? null) : null),
        [bommelIndex]
    );
    return { bommelItems, groupsFor, bommelNameOf };
}

/**
 * State and rules of a split being edited: the parts, the amount each one gets, which fields are missing and why the
 * split cannot be created yet. `total` is the receipt amount the parts are distributed over.
 */
export function useSplitEditor(total: number) {
    const { t } = useTranslation();
    const { bommelItems, groupsFor, bommelNameOf } = useSplitLookups();

    const [parts, setPartsState] = useState<SplitPart[]>([]);
    // The parts as they were seeded; the split is "unsaved" while it differs from them.
    const [seeded, setSeeded] = useState<SplitPart[]>([]);
    // Set once the user reaches for "create": from then on every missing field is marked, not only the touched ones.
    const [attempted, setAttempted] = useState(false);

    const hasTotal = total > 0;
    const sum = sumState(total, parts);
    const perPart = parts.map((part, index) => {
        const amount = partAmount(part, total, parts);
        const groups = groupsFor(part.bommelId);
        const errors = partErrors(part, amount, groups);
        return { part, index, amount, groups, errors, visible: visibleErrors(part, errors, attempted) };
    });
    const fieldLabel = (field: SplitFieldId, label?: string) => label ?? (field === 'amount' ? t('receipts.split.amount') : t('receipts.split.bommel'));
    const reasons: string[] = [
        ...(hasTotal ? [] : [t('receipts.split.noTotalShort')]),
        ...perPart
            .filter((x) => x.errors.length > 0)
            .map((x) => `${t('receipts.split.part', { n: x.index + 1 })}: ${x.errors.map((e) => fieldLabel(e.field, e.label)).join(', ')}`),
        ...(sum.over ? [t('receipts.split.over', { amount: fmtEUR(-sum.diff) })] : []),
    ];
    const nameOf = (part: SplitPart, index: number) =>
        autoName(part, bommelNameOf(part.bommelId), groupsFor(part.bommelId), t('receipts.split.part', { n: index + 1 }));
    const dirty = JSON.stringify(parts.map(({ touched: _touched, ...p }) => p)) !== JSON.stringify(seeded.map(({ touched: _touched, ...p }) => p));

    const updatePart = (key: string, patch: Partial<SplitPart>) => setPartsState((prev) => prev.map((p) => (p.key === key ? { ...p, ...patch } : p)));

    return {
        parts,
        perPart,
        sum,
        hasTotal,
        reasons,
        blocked: reasons.length > 0,
        dirty,
        bommelItems,
        bommelNameOf,
        groupsFor,
        nameOf,
        /** Starts editing from the given parts (also resets the "attempted" marking). */
        seed: (next: SplitPart[]) => {
            setPartsState(next);
            setSeeded(next);
            setAttempted(false);
        },
        /** Marks every missing field, e.g. when the user hovers the disabled create button. */
        markAttempted: () => setAttempted(true),
        payloads: () => toPartPayloads(parts, total, nameOf),
        setAmount: (key: string, value: string) => setPartsState((prev) => setPartAmount(prev, key, value)),
        setBommel: (key: string, bommelId: number | null) =>
            setPartsState((prev) => prev.map((p) => (p.key === key ? setPartBommel(p, bommelId, groupsFor) : p))),
        setCategory: (key: string, groupId: number, value?: string) =>
            setPartsState((prev) =>
                prev.map((p) => {
                    if (p.key !== key) return p;
                    const next = { ...p.categoryValues };
                    if (value == null || value === '') delete next[groupId];
                    else next[groupId] = value;
                    return { ...p, categoryValues: next };
                })
            ),
        touch: (key: string, field: SplitFieldId) =>
            setPartsState((prev) => prev.map((p) => (p.key === key ? { ...p, touched: { ...p.touched, [field]: true } } : p))),
        add: () => setPartsState((prev) => addPart(prev, total)),
        remove: (key: string) => setPartsState((prev) => removePart(prev, key)),
        updatePart,
    };
}

export type SplitEditorState = ReturnType<typeof useSplitEditor>;
