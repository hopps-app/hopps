import { Receipt, ReceiptStatusCheck } from '@/components/Receipts/types';
import { STATUS_DRAFT, STATUS_FAILED, STATUS_PAID, STATUS_UNPAID } from '../constants/constants';

export function getStatusTranslationKey(status: Receipt['status']): string {
    switch (status) {
        case 'paid':
            return 'receipts.status.paid';
        case 'unpaid':
            return 'receipts.status.unpaid';
        case 'draft':
            return 'receipts.status.draft';
        case 'failed':
            return 'receipts.status.failed';
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
        case 'isFailed':
            return status === STATUS_FAILED;
        case 'isPaid':
            return status === STATUS_PAID;
        case 'isUnpaid':
            return status === STATUS_UNPAID;
        default:
            return false;
    }
}
