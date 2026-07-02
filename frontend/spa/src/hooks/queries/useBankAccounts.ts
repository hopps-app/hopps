import {
    ApiException,
    BankAccountCreateRequest,
    BankAccountUpdateRequest,
    BankCsvSchemaCreateRequest,
    BankCsvSchemaUpdateRequest,
    BankCsvColumnMappingDto,
    AmountStrategy,
    BankFieldType,
} from '@hopps/api-client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { documentKeys } from '@/hooks/queries/useDocuments';
import { transactionKeys } from '@/hooks/queries/useTransactions';
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

export const bankTransactionKeys = {
    all: ['bankTransactions'] as const,
    byAccount: (accountId: number, page?: number, size?: number, status?: string) =>
        [...bankTransactionKeys.all, 'account', accountId, { page, size, status }] as const,
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
        mutationFn: ({ bankTxId, transactionId }: { bankTxId: number; transactionId: number }) => apiService.orgService.matchesPOST(bankTxId, transactionId),
        onSuccess: (_, vars) => {
            queryClient.invalidateQueries({ queryKey: bankTransactionKeys.all });
            queryClient.invalidateQueries({ queryKey: [...bankTransactionKeys.all, 'detail', vars.bankTxId] });
        },
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

export function useBankTransactionsByAccount(accountId: number, page = 0, size = 50, status?: string) {
    return useQuery({
        queryKey: bankTransactionKeys.byAccount(accountId, page, size, status),
        queryFn: () => apiService.orgService.byAccount(accountId, undefined, undefined, page, undefined, size, status),
        enabled: !!accountId,
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
        queryFn: () => apiService.orgService.bankTransactionsAll(undefined, undefined, undefined, 0, search || undefined, 25, 'UNMATCHED,PARTIALLY_MATCHED'),
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
