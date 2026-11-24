import type { TransactionResponse } from '@hopps/api-client';
import type { TFunction } from 'i18next';

import { fmtDate } from './format';
import { STATUS_STYLE } from './StatusBadge';

import { toCsv } from '@/lib/csv';
import { formatAmountInput } from '@/lib/currency';
import { getTransactionDisplayStatus } from '@/lib/transactionStatus';

/** The CSV for the given transactions, one line each. Amounts are plain numbers in the UI language, so Excel can sum them. */
export function transactionsCsv(transactions: TransactionResponse[], t: TFunction, locale: string, organizationCurrency: string): string {
    const header = [
        t('transactions.columns.date'),
        t('transactions.columns.amount'),
        t('transactions.export.columns.currency'),
        t('transactions.columns.bommel'),
        t('transactions.columns.category'),
        t('transactions.export.columns.counterparty'),
        t('transactions.export.columns.description'),
        t('transactions.columns.status'),
        t('transactions.export.columns.receipt'),
    ];
    const rows = transactions.map((tx) => [
        tx.transactionTime ? fmtDate(tx.transactionTime) : '',
        formatAmountInput(tx.total, locale),
        tx.currencyCode || organizationCurrency,
        tx.bommelName,
        (tx.categoryValues ?? [])
            .map((c) => c.value)
            .filter(Boolean)
            .join(', '),
        tx.senderName,
        tx.name,
        t(STATUS_STYLE[getTransactionDisplayStatus(tx)].labelKey),
        tx.documentId,
    ]);
    return toCsv([header, ...rows]);
}

/** "hopps-transaktionen-2026-11-18.csv", dated in the user's own time zone. */
export function transactionsExportFileName(prefix: string, now: Date = new Date()): string {
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${prefix}-${now.getFullYear()}-${month}-${day}.csv`;
}
