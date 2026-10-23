import { useBankTransactionAggregate } from '@/hooks/queries/useBankAccounts';
import { useDocuments } from '@/hooks/queries/useDocuments';
import { useTransactionAggregate } from '@/hooks/queries/useTransactions';
import { useStore } from '@/store/store';

/**
 * Counts shown next to menu items: the work still waiting on that page, keyed by menu item id. The queries are the
 * ones the pages use themselves, so a badge updates together with the page (shared cache, same invalidations).
 */
export function useMenuBadges(): Record<string, number> {
    // Without an organization (still loading, or an account without membership) the requests would only fail.
    const hasOrganization = useStore((state) => state.organization != null);
    const { data: documents } = useDocuments(undefined, hasOrganization);
    const { data: openBankTransactions } = useBankTransactionAggregate(undefined, 'UNMATCHED,PARTIALLY_MATCHED', hasOrganization);
    const { data: unconfirmedTransactions } = useTransactionAggregate({ displayStatuses: ['DRAFT', 'PARTIAL', 'LINKED'] }, hasOrganization);

    return {
        receipts: documents?.filter((doc) => doc.documentStatus !== 'CONFIRMED').length ?? 0,
        transactions: unconfirmedTransactions?.count ?? 0,
        'bank-accounts': openBankTransactions?.count ?? 0,
    };
}
