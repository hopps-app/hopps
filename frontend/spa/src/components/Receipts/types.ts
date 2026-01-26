export type ReceiptDocumentType = 'INVOICE' | 'RECEIPT' | undefined;

export interface Receipt {
    id: string;
    issuer: string;
    date: string;
    amount: number;
    category: string;
    status: 'paid' | 'unpaid' | 'draft' | 'failed';
    project: string;
    purpose: string;
    dueDate: string;
    tags: string[];
    reference: string;
    documentType?: ReceiptDocumentType;
}

export type ReceiptStatusCheck = 'isDraft' | 'isFailed' | 'isPaid' | 'isUnpaid';

export interface ReceiptFiltersState {
    search: string;
    startDate: string | null;
    endDate: string | null;
    project: string | null;
    category: string | null;
    type: {
        income: boolean;
        expense: boolean;
    };
    status: {
        unpaid: boolean;
        draft: boolean;
    };
    displayAll: boolean;
}

export type FilterKey = keyof ReceiptFiltersState;

export type SetFilterFn = <K extends FilterKey>(key: K, value: ReceiptFiltersState[K]) => void;
