import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { DateRange, currentYearToDate, monthKeysInRange, sameRangeLastYear } from './periods';

import { SETUP_PROGRESS_KEY } from './setupProgressKey';

import apiService from '@/services/ApiService';

export type MonthlyPoint = {
    monthKey: string;
    income: number;
    expenses: number;
};

/** Sum of the balances of all active bank accounts — the real balance, not income minus expenses. */
export function useBankBalance(organizationId: number | undefined) {
    return useQuery({
        queryKey: ['dashboard', 'bank-balance', organizationId],
        queryFn: async () => {
            const accounts = await apiService.orgService.bankaccountsAll(false);
            return {
                accountCount: accounts.length,
                balance: accounts.reduce((sum, account) => sum + (account.balance ?? account.openingBalance ?? 0), 0),
            };
        },
        enabled: organizationId != null,
        refetchOnMount: 'always',
    });
}

/** Income and expenses since 1 January, next to the same span of the previous year. */
export function useYearTotals(organizationId: number | undefined) {
    const thisYear = useMemo(() => currentYearToDate(), []);
    const lastYear = useMemo(() => sameRangeLastYear(), []);

    return useQuery({
        queryKey: ['dashboard', 'year-totals', organizationId, thisYear.startDate, thisYear.endDate],
        queryFn: async () => {
            const aggregate = (range: DateRange) =>
                apiService.orgService.aggregate2(
                    undefined, // bommelId — the KPIs always cover the whole organization
                    undefined, // categoryValue
                    undefined, // detached
                    undefined, // displayStatus
                    range.endDate,
                    undefined, // privatelyPaid
                    undefined, // search
                    range.startDate,
                    undefined // status
                );

            const [current, previous] = await Promise.all([aggregate(thisYear), aggregate(lastYear)]);

            return {
                income: current.sumIncome ?? 0,
                expenses: current.sumExpense ?? 0,
                transactionCount: current.count ?? 0,
                previousIncome: previous.sumIncome ?? 0,
                previousExpenses: previous.sumExpense ?? 0,
            };
        },
        enabled: organizationId != null,
        refetchOnMount: 'always',
    });
}

/**
 * Uploaded receipts still waiting to be reviewed. Confirming a receipt always ends with a linked
 * transaction, so "not confirmed" is the app's own notion of an open receipt — and it is exactly the
 * set the receipts list shows under its default filter, which is where the banner sends you.
 */
export function useOpenReceiptsCount(organizationId: number | undefined) {
    return useQuery({
        queryKey: ['dashboard', 'open-receipts', organizationId],
        queryFn: async () => {
            const documents = await apiService.orgService.documentsAll(undefined);
            return documents.filter((document) => document.documentStatus !== 'CONFIRMED').length;
        },
        enabled: organizationId != null,
        refetchOnMount: 'always',
    });
}

/** Which first-use steps an organization has done; drives the setup strip on top of the dashboard. */
export type SetupProgress = {
    categories: boolean;
    receipt: boolean;
    /** At least one bank statement imported (an account alone does not bring any data yet). */
    bankImport: boolean;
};

/**
 * First-use progress from real data: a category group, an uploaded receipt and a bank import. The bommel step is read
 * from the bommel store by the caller. Imports exist per account, so accounts are checked one by one until one has an
 * import.
 */
export function useSetupProgress(organizationId: number | undefined) {
    return useQuery({
        queryKey: [...SETUP_PROGRESS_KEY, organizationId],
        queryFn: async (): Promise<SetupProgress> => {
            const [groups, documents, accounts] = await Promise.all([
                apiService.orgService.categoryGroupsAll(undefined),
                apiService.orgService.documentsAll(undefined),
                apiService.orgService.bankaccountsAll(true),
            ]);
            let bankImport = false;
            for (const account of accounts) {
                if (account.id == null) continue;
                const imports = await apiService.orgService.importsAll(account.id, undefined);
                if (imports.length > 0) {
                    bankImport = true;
                    break;
                }
            }
            return { categories: groups.length > 0, receipt: documents.length > 0, bankImport };
        },
        enabled: organizationId != null,
        refetchOnMount: 'always',
        // Not covered by the 5-minute default: returning to the tab should show a step done elsewhere right away.
        staleTime: 0,
    });
}

/** Totals and per-month figures for the current chart selection. */
export function useIncomeExpenseSeries(organizationId: number | undefined, bommelIds: number[] | undefined, range: DateRange) {
    const bommelKey = bommelIds ? bommelIds.join(',') : 'all';

    return useQuery({
        queryKey: ['dashboard', 'income-expense', organizationId, bommelKey, range.startDate, range.endDate],
        queryFn: async () => {
            const [totals, transactions] = await Promise.all([
                apiService.orgService.aggregate2(bommelIds, undefined, undefined, undefined, range.endDate, undefined, undefined, range.startDate, undefined),
                apiService.orgService.transactionsAll(
                    bommelIds,
                    undefined, // categoryValue
                    undefined, // detached
                    undefined, // displayStatus
                    range.endDate,
                    undefined, // page
                    undefined, // privatelyPaid
                    undefined, // search
                    10000, // size — large enough to cover a full year of bookings in one call
                    undefined, // sortBy
                    undefined, // sortDir
                    range.startDate,
                    undefined // status
                ),
            ]);

            const buckets = new Map<string, MonthlyPoint>();
            // Keyed by `yyyy-MM` rather than by month name, so ranges crossing a year boundary
            // ("last 12 months", "previous year") do not fold two Januaries into one bar.
            monthKeysInRange(range).forEach((monthKey) => {
                buckets.set(monthKey, { monthKey, income: 0, expenses: 0 });
            });

            transactions.forEach((transaction) => {
                if (!transaction.transactionTime) {
                    return;
                }
                const date = new Date(transaction.transactionTime);
                const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                const bucket = buckets.get(monthKey);
                if (!bucket) {
                    return;
                }
                const total = transaction.total ?? 0;
                if (total >= 0) {
                    bucket.income += total;
                } else {
                    bucket.expenses += Math.abs(total);
                }
            });

            return {
                income: totals.sumIncome ?? 0,
                expenses: totals.sumExpense ?? 0,
                transactionCount: totals.count ?? 0,
                monthly: Array.from(buckets.values()),
            };
        },
        enabled: organizationId != null,
        refetchOnMount: 'always',
    });
}
