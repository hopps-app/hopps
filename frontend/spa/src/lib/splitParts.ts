// Pure logic of the receipt split ("Belegsplitting"): a document is divided into parts, each becoming its own
// transaction with an amount, a bommel and category-group values. The drawer keeps this state and renders it; every
// rule that does not need React lives here so it can be unit-tested (see splitParts.test.ts).
//
// Amounts are kept as the user typed them (German format, "1.240,00") and parsed on demand. Exactly one part may be the
// "rest" part: its amount is not stored but derived as document total minus the other parts, so the user only types
// n-1 amounts. Typing into the rest part turns it into a fixed part.

import { parseAllocationAmount } from '@/utils/parseAmount';

export interface SplitPart {
    // Client-side identity (stable across edits); the server id is set once the part has been saved.
    key: string;
    id?: number;
    name: string;
    // Amount as typed (German decimal format). Ignored while `rest` is true.
    amount: string;
    bommelId: number | null;
    categoryValues: Record<number, string>;
    rest: boolean;
    // Fields the user has left (blur/close); errors are only shown for touched fields or after a submit attempt.
    touched: Record<string, boolean>;
}

/** The category groups that apply to a bommel, in display order. Mirrors CategoryGroupResponse. */
export interface SplitGroup {
    id: number;
    name: string;
    required: boolean;
}

export type SplitFieldId = 'amount' | 'bommel' | `group:${number}`;

export interface SplitPartError {
    field: SplitFieldId;
    // The group name for a missing mandatory group; the UI translates 'amount' and 'bommel' itself.
    label?: string;
}

// Money is compared in integer cents so that rounding noise never counts as a difference.
export const EPSILON = 0.005;

export function roundCents(value: number): number {
    return Math.round(value * 100) / 100;
}

/** Parses a typed amount; anything that is not a number counts as 0. */
export function parsePartAmount(raw: string): number {
    const parsed = parseAllocationAmount(raw);
    return parsed == null ? 0 : roundCents(parsed);
}

/** Formats a number the way the amount inputs expect it ("1.240,00"). */
export function formatPartAmount(value: number): string {
    return new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}

let keyCounter = 0;

export function createPart(init: Partial<Omit<SplitPart, 'key'>> = {}): SplitPart {
    keyCounter += 1;
    return {
        key: `p${keyCounter}`,
        name: '',
        amount: formatPartAmount(0),
        bommelId: null,
        categoryValues: {},
        rest: false,
        touched: {},
        ...init,
    };
}

/** The amount of the rest part: the document total minus every fixed part. May be negative when over-distributed. */
export function restAmount(total: number, parts: SplitPart[]): number {
    const fixed = parts.filter((p) => !p.rest).reduce((sum, p) => sum + parsePartAmount(p.amount), 0);
    return roundCents(total - fixed);
}

/** The effective amount of a part: derived for the rest part, parsed for every other. */
export function partAmount(part: SplitPart, total: number, parts: SplitPart[]): number {
    return part.rest ? restAmount(total, parts) : parsePartAmount(part.amount);
}

/** Sum of all effective part amounts. */
export function assignedAmount(total: number, parts: SplitPart[]): number {
    return roundCents(parts.reduce((sum, p) => sum + partAmount(p, total, parts), 0));
}

export interface SumState {
    assigned: number;
    // Positive: not yet distributed (allowed, e.g. a private share); negative: over-distributed (an error).
    diff: number;
    over: boolean;
    unassigned: number;
}

/**
 * How the parts relate to the document total. The parts may add up to less than the total (a receipt can contain a
 * share that is not booked), so only over-distribution is an error.
 */
export function sumState(total: number, parts: SplitPart[]): SumState {
    const assigned = assignedAmount(total, parts);
    const diff = roundCents(total - assigned);
    return { assigned, diff, over: diff < -EPSILON, unassigned: diff > EPSILON ? diff : 0 };
}

/**
 * Appends a part prefilled with the still-open amount. When the split so far was a single part, that part becomes the
 * rest part, so the user only has to type the amount of the new one.
 */
export function addPart(parts: SplitPart[], total: number, init: Partial<Omit<SplitPart, 'key'>> = {}): SplitPart[] {
    const open = Math.max(0, sumState(total, parts).diff);
    const base = parts.length === 1 ? [{ ...parts[0], rest: true }] : parts;
    return [...base, createPart({ amount: formatPartAmount(open), ...init })];
}

/**
 * Removes a part. The rest role is handed to the first remaining part when the removed one had it; a single remaining
 * part is always the rest part, so the split collapses back to "not split".
 */
export function removePart(parts: SplitPart[], key: string): SplitPart[] {
    const removed = parts.find((p) => p.key === key);
    let next = parts.filter((p) => p.key !== key);
    if (removed?.rest && next.length > 0) {
        next = next.map((p, i) => (i === 0 ? { ...p, rest: true } : p));
    }
    if (next.length === 1) {
        next = [{ ...next[0], rest: true }];
    }
    return next;
}

/** Sets a fixed amount on a part; this always ends its rest role. */
export function setPartAmount(parts: SplitPart[], key: string, amount: string): SplitPart[] {
    return parts.map((p) => (p.key === key ? { ...p, amount, rest: false } : p));
}

/** Distributes the total evenly; the first part takes the rounding remainder by becoming the rest part. */
export function distributeEvenly(parts: SplitPart[], total: number): SplitPart[] {
    if (parts.length === 0) return parts;
    const each = roundCents(total / parts.length);
    return parts.map((p, i) => (i === 0 ? { ...p, rest: true } : { ...p, rest: false, amount: formatPartAmount(each) }));
}

/**
 * Changes the bommel of a part. Values of category groups that do not apply to the new bommel are dropped, because
 * the groups of a part are always derived from its bommel.
 */
export function setPartBommel(part: SplitPart, bommelId: number | null, groupsForBommel: (id: number | null) => SplitGroup[]): SplitPart {
    const keep = new Set(groupsForBommel(bommelId).map((g) => g.id));
    const categoryValues = Object.fromEntries(Object.entries(part.categoryValues).filter(([groupId]) => keep.has(Number(groupId))));
    return { ...part, bommelId, categoryValues };
}

/** The validation errors of one part: amount, bommel and every mandatory group without a value. */
export function partErrors(part: SplitPart, amount: number, groups: SplitGroup[]): SplitPartError[] {
    const errors: SplitPartError[] = [];
    if (amount <= 0) errors.push({ field: 'amount' });
    if (part.bommelId == null) errors.push({ field: 'bommel' });
    for (const group of groups) {
        const value = part.categoryValues[group.id];
        if (group.required && (value == null || value.trim() === '')) {
            errors.push({ field: `group:${group.id}`, label: group.name });
        }
    }
    return errors;
}

/** Errors to display: only for touched fields, or all of them after a submit attempt. */
export function visibleErrors(part: SplitPart, errors: SplitPartError[], attempted: boolean): SplitPartError[] {
    return errors.filter((e) => attempted || part.touched[e.field]);
}

/**
 * The automatic transaction name: the typed name, else "Bommel · first category value" (first in the display order of
 * the bommel's groups), else "Teil n". The caller passes the translated fallback so this stays free of i18n.
 */
export function autoName(part: SplitPart, bommelName: string | null, groups: SplitGroup[], fallback: string): string {
    if (part.name.trim()) return part.name.trim();
    const firstValue = groups.map((g) => part.categoryValues[g.id]).find((v) => v && v.trim());
    const joined = [bommelName, firstValue].filter(Boolean).join(' · ');
    return joined || fallback;
}

export interface SplitPartPayload {
    id?: number;
    name: string;
    amount: number;
    bommelId: number | null;
    categoryValues: Record<number, string>;
}

/**
 * The parts as the backend expects them: effective (positive) amounts, auto names fixed, no client-only state. The
 * sign is applied by the backend from the document direction.
 */
export function toPartPayloads(parts: SplitPart[], total: number, nameOf: (part: SplitPart, index: number) => string): SplitPartPayload[] {
    return parts.map((part, index) => ({
        id: part.id,
        name: nameOf(part, index),
        amount: partAmount(part, total, parts),
        bommelId: part.bommelId,
        categoryValues: Object.fromEntries(Object.entries(part.categoryValues).filter(([, v]) => v && v.trim() !== '')),
    }));
}
