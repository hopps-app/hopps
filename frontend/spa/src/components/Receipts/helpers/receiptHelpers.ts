import { STATUS_DRAFT, STATUS_SAVED } from '../constants/constants';

import { Receipt, ReceiptStatusCheck } from '@/components/Receipts/types';

export function getStatusTranslationKey(status: Receipt['status']): string {
    switch (status) {
        case 'draft':
            return 'receipts.status.draft';
        case 'saved':
            return 'receipts.status.saved';
        default:
            return '';
    }
}

export function formatAmount(amount: number): string {
    const sign = amount < 0 ? '' : '+';
    return `${sign}${amount.toFixed(2)} €`;
}

export function amountColorClass(amount: number): string {
    return amount < 0 ? 'text-red-600' : 'text-green-600';
}

export function checkReceiptStatus(status: Receipt['status'], check: ReceiptStatusCheck): boolean {
    switch (check) {
        case 'isDraft':
            return status === STATUS_DRAFT;
        case 'isSaved':
            return status === STATUS_SAVED;
        default:
            return false;
    }
}
