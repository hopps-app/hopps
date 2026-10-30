import { TransactionDisplayStatus, TransactionResponse } from '@hopps/api-client';
import { keepPreviousData, useQuery } from '@tanstack/react-query';

import type { BadgeTone } from '@/components/Transactions/StatusBadge';
import { useCurrency } from '@/hooks/use-currency';
import { useDebounce } from '@/hooks/use-debounce';
import apiService from '@/services/ApiService';

const EPS = 0.005;
const DAY_MS = 86_400_000;
const round2 = (n: number) => Math.round(n * 100) / 100;
// A candidate counts as a strong match (confidence pill, suggestion in the drawer) from this score on.
export const STRONG_MATCH = 0.7;
// Transactions that still need bank coverage: nothing linked yet, or only partly covered. Fully covered (LINKED) and
// confirmed ones are not offered.
const OPEN: TransactionDisplayStatus[] = ['DRAFT', 'PARTIAL'];

// Colour of a match score, for the confidence pill of the picker and the match pill of the suggestions.
export const confidenceTone = (score: number): BadgeTone => (score >= 0.9 ? 'pos' : score >= 0.75 ? 'warn' : 'neg');

// What a transaction still needs: its amount minus what other bank movements already cover.
const openOf = (t: TransactionResponse) => Math.max(0, Math.abs(t.total ?? 0) - Math.abs(t.coveredAmount ?? 0));

/**
 * Match quality between a candidate and the bank movement, 0..0.99: the closer the transaction's open amount is to the
 * movement's open rest, and the closer the dates, the higher.
 */
function matchScore(t: TransactionResponse, rest: number, bookingDate: Date | undefined): number {
    const delta = Math.abs(openOf(t) - rest);
    const days = t.transactionTime && bookingDate ? Math.abs(new Date(t.transactionTime).getTime() - new Date(bookingDate).getTime()) / DAY_MS : 60;
    return Math.max(0, Math.min(0.99, 1 - (delta / Math.max(rest, 1)) * 1.6 - Math.min(days, 60) / 260));
}

/**
 * The portion of the movement that fits a candidate: what the transaction still needs, capped by what is open on the
 * movement. A transaction without an amount yet takes the open rest.
 */
export function fitOf(t: TransactionResponse, rest: number): number {
    return round2(Math.abs(t.total ?? 0) > EPS ? Math.min(openOf(t), rest) : rest);
}

/**
 * The amount to send when linking `amount` of the movement to `t`: undefined when it equals the backend's default
 * allocation (the transaction's amount capped by the movement), so the default stays a plain link; otherwise the
 * explicit (manual) allocation.
 */
export function allocationFor(t: TransactionResponse, amount: number, bankAmount: number): number | undefined {
    return Math.abs(amount - defaultAllocation(t, bankAmount)) <= EPS ? undefined : amount;
}

/** What the backend allocates to a plain link: the transaction's amount capped by the movement. */
export function defaultAllocation(t: TransactionResponse, bankAmount: number): number {
    const magnitude = Math.abs(bankAmount);
    const total = Math.abs(t.total ?? 0);
    return total > EPS ? Math.min(total, magnitude) : magnitude;
}

function listOpen(search: string | undefined, size: number) {
    return apiService.orgService.transactionsAll(
        undefined, // bommelId
        undefined, // categoryValue
        undefined, // detached
        OPEN, // displayStatus
        undefined, // endDate
        0, // page
        undefined, // privatelyPaid
        search, // search
        size, // size
        undefined, // sortBy
        undefined, // sortDir
        undefined, // startDate
        undefined // status
    );
}

export interface MatchCandidate {
    tx: TransactionResponse;
    score: number;
}

interface Options {
    /** Signed amount of the bank movement; only transactions of the same direction are offered. */
    bankAmount: number;
    bookingDate?: Date;
    /** Magnitude of the bank movement still open. */
    rest: number;
    linkedIds: ReadonlySet<number>;
    /** Free-text search of the picker; empty for the suggestions. */
    search?: string;
}

/**
 * The open transactions that can cover a bank movement, sorted by match quality. Combines the newest open transactions
 * with a backend search for the movement's open rest (the backend matches the amount across all transactions, not
 * just the newest), and with a backend search for a typed term. Until the backend answers a term, the loaded ones are
 * filtered locally, so the list reacts right away.
 */
export function useMatchCandidates({ bankAmount, bookingDate, rest, linkedIds, search = '' }: Options) {
    const { format } = useCurrency();
    const term = search.trim();
    const debouncedTerm = useDebounce(term, 300);
    const restTerm = rest > EPS ? rest.toFixed(2) : '';

    const {
        data: newest = [],
        isFetching,
        isLoading: newestLoading,
    } = useQuery({
        queryKey: ['transactions', 'forMatch', 'open'],
        queryFn: () => listOpen(undefined, 200),
    });
    const { data: byAmount = [], isLoading: amountLoading } = useQuery({
        queryKey: ['transactions', 'forMatch', 'amount', restTerm],
        queryFn: () => listOpen(restTerm, 50),
        enabled: restTerm !== '',
        // The rest changes with every link; keep the hits meanwhile, so the suggestions do not flicker.
        placeholderData: keepPreviousData,
    });
    const { data: bySearch = [] } = useQuery({
        queryKey: ['transactions', 'forMatch', 'search', debouncedTerm],
        queryFn: () => listOpen(debouncedTerm, 50),
        enabled: debouncedTerm !== '',
        placeholderData: keepPreviousData,
    });

    const bankSign = Math.sign(bankAmount);
    const fits = (tx: TransactionResponse) =>
        tx.id != null && !linkedIds.has(tx.id) && (tx.total == null || Math.abs(tx.total) <= EPS || (Math.sign(tx.total) === bankSign && openOf(tx) > EPS));
    const score = (txs: TransactionResponse[]): MatchCandidate[] => {
        const byId = new Map<number, TransactionResponse>();
        txs.filter(fits).forEach((tx) => byId.set(tx.id!, tx));
        return [...byId.values()].map((tx) => ({ tx, score: matchScore(tx, rest, bookingDate) })).sort((a, b) => b.score - a.score);
    };

    const candidates = score([...newest, ...byAmount]);

    const needle = term.toLowerCase().replace(/\s+/g, '');
    const list = needle
        ? score([
              ...candidates
                  .map((c) => c.tx)
                  .filter((tx) => [tx.name, tx.senderName, format(Math.abs(tx.total ?? 0))].join('|').toLowerCase().replace(/\s+/g, '').includes(needle)),
              // Only the backend hits for the current term, not those still kept from the previous one.
              ...(debouncedTerm === term ? bySearch : []),
          ])
        : candidates;

    return { candidates, list, searching: needle !== '', loading: isFetching && newest.length === 0, settled: !newestLoading && !amountLoading };
}
