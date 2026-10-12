import type { DocumentResponse } from '@hopps/api-client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { TreeNodeData } from '../types';

import { documentsQuery } from '@/hooks/queries/useDocuments';
import { transactionAggregateQuery } from '@/hooks/queries/useTransactions';

/** All Bommel below `node`, depth first */
export function descendantsOf(node: TreeNodeData): TreeNodeData[] {
    return (node.children ?? []).flatMap((child) => [child, ...descendantsOf(child)]);
}

/** The Bommel a delete affects: the node itself plus every Bommel below it */
function affectedIds(node: TreeNodeData): number[] {
    return [node.attributes?.id as number, ...descendantsOf(node).map((d) => d.attributes?.id as number)];
}

// The three counts the delete dialog shows. Shared by the dialog and the prefetch so both hit the same cache entries.
function impactQueries(bommelIds: number[]) {
    return {
        transactions: transactionAggregateQuery({ bommelIds }),
        confirmedTransactions: transactionAggregateQuery({ bommelIds, displayStatuses: ['CONFIRMED'] }),
        documents: documentsQuery(),
    };
}

/** What deleting `node` touches: how many transactions and receipts are kept, and how many of them get reopened */
export function useDeleteImpact(node: TreeNodeData) {
    const bommelIds = affectedIds(node);
    const queries = impactQueries(bommelIds);
    const transactions = useQuery(queries.transactions);
    const confirmedTransactions = useQuery(queries.confirmedTransactions);
    const documents = useQuery(queries.documents);

    const ids = new Set(bommelIds);
    const receipts = ((documents.data ?? []) as DocumentResponse[]).filter((doc) => doc.bommelId != null && ids.has(doc.bommelId));

    return {
        loading: transactions.isLoading || confirmedTransactions.isLoading || documents.isLoading,
        transactionCount: transactions.data?.count ?? 0,
        confirmedTransactionCount: confirmedTransactions.data?.count ?? 0,
        receiptCount: receipts.length,
        confirmedReceiptCount: receipts.filter((doc) => doc.documentStatus === 'CONFIRMED').length,
    };
}

/**
 * Starts loading the delete dialog's counts ahead of time (on hover or focus of the delete button), so the dialog can
 * open with its full text. Resolves when they are in the cache; already cached counts are not fetched again.
 */
export function usePrefetchDeleteImpact() {
    const queryClient = useQueryClient();
    return useCallback(
        (node: TreeNodeData) => {
            const queries = impactQueries(affectedIds(node));
            return Promise.all([
                queryClient.prefetchQuery(queries.transactions),
                queryClient.prefetchQuery(queries.confirmedTransactions),
                queryClient.prefetchQuery(queries.documents),
            ]).then(() => undefined);
        },
        [queryClient]
    );
}
