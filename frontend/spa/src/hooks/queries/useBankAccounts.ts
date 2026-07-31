import {
    ApiException,
    BankAccountCreateRequest,
    BankAccountUpdateRequest,
    BankCsvSchemaCreateRequest,
    BankCsvSchemaUpdateRequest,
    BankCsvColumnMappingDto,
    AmountStrategy,
    BankFieldType,
    MatchRequest,
    MatchAmountRequest,
} from '@hopps/api-client';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { documentKeys, showUploadError } from '@/hooks/queries/useDocuments';
import { transactionKeys, type SortDirection } from '@/hooks/queries/useTransactions';
import { useToast } from '@/hooks/use-toast';
import apiService from '@/services/ApiService';

// ─── Query Keys ─────────────────────────────────────────────────────────────

export const bankAccountKeys = {
    all: ['bankAccounts'] as const,
    lists: () => [...bankAccountKeys.all, 'list'] as const,
    list: (includeArchived?: boolean) => [...bankAccountKeys.lists(), { includeArchived }] as const,
    detail: (id: number) => [...bankAccountKeys.all, 'detail', id] as const,
};

export const bankSchemaKeys = {
    all: ['bankSchemas'] as const,
    lists: () => [...bankSchemaKeys.all, 'list'] as const,
    list: (includeArchived?: boolean) => [...bankSchemaKeys.lists(), { includeArchived }] as const,
    detail: (id: number) => [...bankSchemaKeys.all, 'detail', id] as const,
    templates: () => [...bankSchemaKeys.all, 'templates'] as const,
};

export const bankImportKeys = {
    all: ['bankImports'] as const,
    byAccount: (accountId: number) => [...bankImportKeys.all, 'account', accountId] as const,
    detail: (id: number) => [...bankImportKeys.all, 'detail', id] as const,
};

export type BankTransactionSortField = 'bookingDate' | 'amount' | 'counterpartyName';

/**
 * Free-text + column filters shared by the bank-transaction list feeds. All fields are strings (as typed into the
 * filter inputs); empty/undefined means "no filter". {@code minAmount}/{@code maxAmount} filter on the amount
 * magnitude and accept a comma or dot decimal separator (parsed backend-side).
 */
export interface BankTxFilter {
    search?: string;
    minAmount?: string;
    maxAmount?: string;
    dateFrom?: string;
    dateTo?: string;
}

export const bankTransactionKeys = {
    all: ['bankTransactions'] as const,
    byAccount: (
        accountId: number,
        page?: number,
        size?: number,
        status?: string,
        sort?: BankTransactionSortField,
        direction?: SortDirection,
        filter?: BankTxFilter
    ) => [...bankTransactionKeys.all, 'account', accountId, { page, size, status, sort, direction, ...filter }] as const,
    // Cross-account listing (all accounts when accountIds is omitted).
    list: (status?: string, page?: number, size?: number, sort?: BankTransactionSortField, direction?: SortDirection, filter?: BankTxFilter) =>
        [...bankTransactionKeys.all, 'list', { status, page, size, sort, direction, ...filter }] as const,
    // Aggregate totals + true (uncapped) count for a filter set.
    aggregate: (accountIds?: string, status?: string, filter?: BankTxFilter) =>
        [...bankTransactionKeys.all, 'aggregate', { accountIds, status, ...filter }] as const,
};

// ─── Bank Accounts ───────────────────────────────────────────────────────────

export function useBankAccounts(includeArchived?: boolean) {
    return useQuery({
        queryKey: bankAccountKeys.list(includeArchived),
        queryFn: () => apiService.orgService.bankaccountsAll(includeArchived),
    });
}

export function useBankAccount(id: number) {
    return useQuery({
        queryKey: bankAccountKeys.detail(id),
        queryFn: () => apiService.orgService.bankaccountsGET(id),
        enabled: !!id,
    });
}

export function useCreateBankAccount() {
    const queryClient = useQueryClient();
    const { showSuccess, showError } = useToast();
    const { t } = useTranslation();

    return useMutation({
        mutationFn: (data: IBankAccountCreateRequest) => apiService.orgService.bankaccountsPOST(new BankAccountCreateRequest(data)),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: bankAccountKeys.lists() });
            showSuccess(t('bankAccounts.toast.createSuccess'));
        },
        onError: (err) => {
            if (ApiException.isApiException(err) && err.status === 409) return;
            showError(t('bankAccounts.toast.createError'));
        },
    });
}

export function useUpdateBankAccount() {
    const queryClient = useQueryClient();
    const { showSuccess, showError } = useToast();
    const { t } = useTranslation();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: IBankAccountUpdateRequest }) =>
            apiService.orgService.bankaccountsPATCH(id, new BankAccountUpdateRequest(data)),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: bankAccountKeys.lists() });
            queryClient.invalidateQueries({ queryKey: bankAccountKeys.detail(variables.id) });
            showSuccess(t('bankAccounts.toast.updateSuccess'));
        },
        onError: (err) => {
            if (ApiException.isApiException(err) && err.status === 409) return;
            showError(t('bankAccounts.toast.updateError'));
        },
    });
}

export function useArchiveBankAccount() {
    const queryClient = useQueryClient();
    const { showSuccess, showError } = useToast();
    const { t } = useTranslation();

    return useMutation({
        mutationFn: (id: number) => apiService.orgService.bankaccountsDELETE(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: bankAccountKeys.lists() });
            showSuccess(t('bankAccounts.toast.archiveSuccess'));
        },
        onError: () => {
            showError(t('bankAccounts.toast.archiveError'));
        },
    });
}

export function useRestoreBankAccount() {
    const queryClient = useQueryClient();
    const { showSuccess, showError } = useToast();
    const { t } = useTranslation();

    return useMutation({
        mutationFn: (id: number) => apiService.orgService.restore2(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: bankAccountKeys.lists() });
            showSuccess(t('bankAccounts.toast.restoreSuccess'));
        },
        onError: () => {
            showError(t('bankAccounts.toast.restoreError'));
        },
    });
}

// ─── Bank Schemas ─────────────────────────────────────────────────────────────

export function useBankSchemas(includeArchived?: boolean) {
    return useQuery({
        queryKey: bankSchemaKeys.list(includeArchived),
        queryFn: () => apiService.orgService.bankSchemasAll(includeArchived),
    });
}

export function useBankSchemaTemplates() {
    return useQuery({
        queryKey: bankSchemaKeys.templates(),
        queryFn: () => apiService.orgService.templates(),
    });
}

export function useCreateBankSchema() {
    const queryClient = useQueryClient();
    const { showSuccess, showError } = useToast();
    const { t } = useTranslation();

    return useMutation({
        mutationFn: ({ data, fromTemplate }: { data: IBankSchemaCreateRequest; fromTemplate?: string }) =>
            apiService.orgService.bankSchemasPOST(
                fromTemplate,
                new BankCsvSchemaCreateRequest({
                    ...data,
                    columnMappings: data.columnMappings.map((m) => new BankCsvColumnMappingDto(m)),
                })
            ),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: bankSchemaKeys.lists() });
            showSuccess(t('bankSchema.toast.createSuccess'));
        },
        onError: () => {
            showError(t('bankSchema.toast.createError'));
        },
    });
}

export function useUpdateBankSchema() {
    const queryClient = useQueryClient();
    const { showSuccess, showError } = useToast();
    const { t } = useTranslation();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: IBankSchemaUpdateRequest }) =>
            apiService.orgService.bankSchemasPATCH(
                id,
                new BankCsvSchemaUpdateRequest({
                    ...data,
                    columnMappings: data.columnMappings?.map((m) => new BankCsvColumnMappingDto(m)),
                })
            ),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: bankSchemaKeys.lists() });
            queryClient.invalidateQueries({ queryKey: bankSchemaKeys.detail(variables.id) });
            showSuccess(t('bankSchema.toast.updateSuccess'));
        },
        onError: () => {
            showError(t('bankSchema.toast.updateError'));
        },
    });
}

export function useDeleteBankSchema() {
    const queryClient = useQueryClient();
    const { showSuccess, showError } = useToast();
    const { t } = useTranslation();

    return useMutation({
        mutationFn: (id: number) => apiService.orgService.bankSchemasDELETE(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: bankSchemaKeys.lists() });
            showSuccess(t('bankSchema.toast.deleteSuccess'));
        },
        onError: () => {
            showError(t('bankSchema.toast.deleteError'));
        },
    });
}

export function useArchiveBankSchema() {
    const queryClient = useQueryClient();
    const { showSuccess, showError } = useToast();
    const { t } = useTranslation();

    return useMutation({
        mutationFn: (id: number) => apiService.orgService.archive(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: bankSchemaKeys.lists() });
            showSuccess(t('bankSchema.toast.archiveSuccess'));
        },
        onError: () => {
            showError(t('bankSchema.toast.archiveError'));
        },
    });
}

export function useRestoreBankSchema() {
    const queryClient = useQueryClient();
    const { showSuccess, showError } = useToast();
    const { t } = useTranslation();

    return useMutation({
        mutationFn: (id: number) => apiService.orgService.restore(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: bankSchemaKeys.lists() });
            showSuccess(t('bankSchema.toast.restoreSuccess'));
        },
        onError: () => {
            showError(t('bankSchema.toast.restoreError'));
        },
    });
}

// ─── Bank Imports ─────────────────────────────────────────────────────────────

export function useBankImports(accountId: number) {
    return useQuery({
        queryKey: bankImportKeys.byAccount(accountId),
        queryFn: () => apiService.orgService.importsAll(accountId, undefined),
        enabled: !!accountId,
    });
}

export function useBankImport(id: number | null) {
    return useQuery({
        queryKey: bankImportKeys.detail(id ?? 0),
        queryFn: () => apiService.orgService.importsGET(id!),
        enabled: id !== null && id > 0,
        refetchInterval: (query) => {
            const status = query.state.data?.status;
            if (status === 'COMPLETED' || status === 'PARTIAL' || status === 'FAILED') return false;
            return 1000;
        },
    });
}

export function useStartImport() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ accountId, file, schemaId }: { accountId: number; file: File; schemaId?: number }) =>
            apiService.orgService.importsPOST(accountId, { data: file, fileName: file.name }, schemaId),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: bankImportKeys.byAccount(variables.accountId) });
        },
    });
}

export function useRollbackImport() {
    const queryClient = useQueryClient();
    const { showSuccess, showError } = useToast();
    const { t } = useTranslation();

    return useMutation({
        mutationFn: ({ importId, accountId }: { importId: number; accountId: number }) =>
            apiService.orgService.importsDELETE(importId).then(() => ({ accountId })),
        onSuccess: ({ accountId }) => {
            queryClient.invalidateQueries({ queryKey: bankImportKeys.byAccount(accountId) });
            showSuccess(t('bankImport.toast.rollbackSuccess'));
        },
        onError: () => {
            showError(t('bankImport.toast.rollbackError'));
        },
    });
}

export function useCsvPreview() {
    return useMutation({
        mutationFn: ({ accountId, file }: { accountId: number; file: File }) => apiService.orgService.preview(accountId, { data: file, fileName: file.name }),
    });
}

/**
 * Uploads a receipt for an unmatched bank transaction. The backend creates a DRAFT transaction pre-filled from the bank
 * movement (counterparty, amount, purpose), links the receipt to it and matches it to the bank transaction. Returns the
 * created document so the caller can open it for review.
 */
export function useCreateReceiptForBankTransaction() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ bankTxId, file }: { bankTxId: number; file: File }) =>
            apiService.orgService.receipt(bankTxId, true, { data: file, fileName: file.name }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: bankTransactionKeys.all });
            queryClient.invalidateQueries({ queryKey: documentKeys.all });
            queryClient.invalidateQueries({ queryKey: transactionKeys.all });
        },
        onError: showUploadError,
    });
}

export function useSuggestSchema(accountId: number, headerColumns: string[] | null) {
    return useQuery({
        queryKey: ['suggestSchema', accountId, headerColumns],
        queryFn: () => apiService.orgService.suggestSchema(accountId, headerColumns!.join(',')),
        enabled: headerColumns != null && headerColumns.length > 0,
        staleTime: Infinity,
    });
}

// ─── Bank Transactions ────────────────────────────────────────────────────────

export function useBankTransaction(id: number | null) {
    return useQuery({
        queryKey: [...bankTransactionKeys.all, 'detail', id],
        queryFn: () => apiService.orgService.bankTransactions(id!),
        enabled: id !== null && id > 0,
    });
}

export function useAddBankTransactionMatch() {
    const queryClient = useQueryClient();
    return useMutation({
        // `amount` is the portion of the bank movement used for this transaction (the allocation). Omit it for the full
        // amount; pass a value to split a collective transfer across several transactions.
        mutationFn: ({ bankTxId, transactionId, amount }: { bankTxId: number; transactionId: number; amount?: number }) =>
            apiService.orgService.matchesPOST(bankTxId, new MatchRequest({ transactionId, amount })),
        onSuccess: (_, vars) => {
            queryClient.invalidateQueries({ queryKey: bankTransactionKeys.all });
            queryClient.invalidateQueries({ queryKey: [...bankTransactionKeys.all, 'detail', vars.bankTxId] });
            // Matching may fill an empty transaction amount from the bank movement — refresh transactions too.
            queryClient.invalidateQueries({ queryKey: transactionKeys.all });
        },
    });
}

// Updates how much of a bank movement is used for one linked transaction (the allocation). Used to disentangle a
// collective transfer after the fact.
export function useUpdateBankTransactionMatchAmount() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ bankTxId, transactionId, amount }: { bankTxId: number; transactionId: number; amount: number }) =>
            apiService.orgService.matchesPATCH(bankTxId, transactionId, new MatchAmountRequest({ amount })),
        onSuccess: (_, vars) => {
            queryClient.invalidateQueries({ queryKey: bankTransactionKeys.all });
            queryClient.invalidateQueries({ queryKey: [...bankTransactionKeys.all, 'detail', vars.bankTxId] });
            queryClient.invalidateQueries({ queryKey: transactionKeys.all });
        },
    });
}

// The per-transaction allocations of a bank transaction — how much of the movement each linked transaction consumed.
export function useBankTransactionMatches(bankTxId: number | null) {
    return useQuery({
        queryKey: [...bankTransactionKeys.all, 'matches', bankTxId],
        queryFn: () => apiService.orgService.matchesAll(bankTxId!),
        enabled: bankTxId !== null && bankTxId > 0,
    });
}

export function useRemoveBankTransactionMatch() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ bankTxId, transactionId }: { bankTxId: number; transactionId: number }) => apiService.orgService.matchesDELETE(bankTxId, transactionId),
        onSuccess: (_, vars) => {
            queryClient.invalidateQueries({ queryKey: bankTransactionKeys.all });
            queryClient.invalidateQueries({ queryKey: [...bankTransactionKeys.all, 'detail', vars.bankTxId] });
        },
    });
}

export function useIgnoreBankTransaction() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (bankTxId: number) => apiService.orgService.ignorePOST(bankTxId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: bankTransactionKeys.all });
        },
    });
}

export function useBankTransactionsByAccount(
    accountId: number,
    page = 0,
    size = 50,
    status?: string,
    sort: BankTransactionSortField = 'bookingDate',
    direction: SortDirection = 'desc',
    filter: BankTxFilter = {}
) {
    return useQuery({
        queryKey: bankTransactionKeys.byAccount(accountId, page, size, status, sort, direction, filter),
        queryFn: () =>
            apiService.orgService.byAccount(
                accountId,
                filter.dateFrom || undefined,
                filter.dateTo || undefined,
                direction,
                filter.maxAmount || undefined,
                filter.minAmount || undefined,
                page,
                filter.search || undefined,
                size,
                sort,
                status
            ),
        enabled: !!accountId,
        // Keep the current rows on screen while a changed filter/page/sort refetches, so the list (and the search box
        // above it) never blanks out into the loading state between keystrokes.
        placeholderData: keepPreviousData,
    });
}

/**
 * Cross-account bank transaction listing (all accounts) with server-side paging. Used by the reconciliation feed so
 * that more than one page of open transactions can be reached.
 */
export function useAllBankTransactions(
    status: string | undefined,
    page = 0,
    size = 25,
    sort: BankTransactionSortField = 'bookingDate',
    direction: SortDirection = 'desc',
    filter: BankTxFilter = {}
) {
    return useQuery({
        queryKey: bankTransactionKeys.list(status, page, size, sort, direction, filter),
        queryFn: () =>
            apiService.orgService.bankTransactionsAll(
                undefined, // accountIds → all accounts
                filter.dateFrom || undefined,
                filter.dateTo || undefined,
                direction,
                filter.maxAmount || undefined,
                filter.minAmount || undefined,
                page,
                filter.search || undefined,
                size,
                sort,
                status
            ),
        // Keep the previous page/filter results visible while the changed query refetches (see byAccount above), so the
        // reconciliation feed and its filter bar don't collapse into the full-page loading state on every keystroke.
        placeholderData: keepPreviousData,
    });
}

/**
 * Aggregate totals and the true (uncapped) transaction count for a filter set. Pass a single account id via
 * {@code accountIds} for per-account figures, or omit it for the whole organization.
 */
export function useBankTransactionAggregate(accountIds?: string, status?: string, enabled = true, filter: BankTxFilter = {}) {
    return useQuery({
        queryKey: bankTransactionKeys.aggregate(accountIds, status, filter),
        queryFn: () =>
            apiService.orgService.aggregate(
                accountIds,
                filter.dateFrom || undefined,
                filter.dateTo || undefined,
                filter.maxAmount || undefined,
                filter.minAmount || undefined,
                filter.search || undefined,
                status
            ),
        enabled,
        // Keep the previous counts/totals during a filter change so the badges don't reset the surrounding view into
        // its loading state (which would unmount the search box) while typing.
        placeholderData: keepPreviousData,
    });
}

// Bank transactions currently linked (matched) to a given hopps transaction — the reverse direction of the N:M mapping,
// served directly by the backend so the link is visible from the transaction side too.
export function useBankTransactionsForTransaction(transactionId: number | null | undefined) {
    return useQuery({
        queryKey: [...bankTransactionKeys.all, 'forTransaction', transactionId],
        queryFn: () => apiService.orgService.forTransaction(transactionId!),
        enabled: !!transactionId,
    });
}

// Searchable list of bank transactions to pick from when linking manually.
// Returns transactions whose amount is not yet fully covered — i.e. UNMATCHED and PARTIALLY_MATCHED.
// A bank transaction only drops out of this list once it is FULLY_MATCHED (or ignored).
export function useBankTransactionSearch(search: string, enabled: boolean) {
    return useQuery({
        queryKey: [...bankTransactionKeys.all, 'search', search],
        queryFn: () =>
            apiService.orgService.bankTransactionsAll(
                undefined, // accountIds
                undefined, // dateFrom
                undefined, // dateTo
                undefined, // direction
                undefined, // maxAmount
                undefined, // minAmount
                0, // page
                search || undefined,
                25, // size
                undefined, // sort
                'UNMATCHED,PARTIALLY_MATCHED' // status
            ),
        enabled,
    });
}

// ─── Local Types ──────────────────────────────────────────────────────────────

export interface IBankAccountCreateRequest {
    name: string;
    iban: string;
    bic?: string;
    bankName?: string;
    accountHolder?: string;
    currency?: string;
    openingBalance?: number;
    openingBalanceDate?: Date;
    description?: string;
    color?: string;
    defaultSchemaId?: number;
    bommelId?: number;
}

export interface IBankAccountUpdateRequest {
    name?: string;
    iban?: string;
    bic?: string;
    bankName?: string;
    accountHolder?: string;
    currency?: string;
    openingBalance?: number;
    openingBalanceDate?: Date;
    description?: string;
    color?: string;
    defaultSchemaId?: number;
    bommelId?: number;
}

export interface IBankSchemaColumnMapping {
    targetField: BankFieldType;
    sourceColumnIndex?: number;
    sourceColumnName?: string;
    transform?: string;
}

export interface IBankSchemaCreateRequest {
    name: string;
    bankIdentifier?: string;
    delimiter?: string;
    quoteChar?: string;
    encoding?: string;
    skipLines?: number;
    hasHeader?: boolean;
    dateFormat?: string;
    decimalSeparator?: string;
    thousandSeparator?: string;
    amountStrategy: AmountStrategy;
    amountTypePositiveValues?: string[];
    columnMappings: IBankSchemaColumnMapping[];
}

export interface IBankSchemaUpdateRequest {
    name?: string;
    bankIdentifier?: string;
    delimiter?: string;
    quoteChar?: string;
    encoding?: string;
    skipLines?: number;
    hasHeader?: boolean;
    dateFormat?: string;
    decimalSeparator?: string;
    thousandSeparator?: string;
    amountStrategy?: AmountStrategy;
    amountTypePositiveValues?: string[];
    columnMappings?: IBankSchemaColumnMapping[];
}
