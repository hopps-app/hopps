export interface Receipt {
    id: string;
    issuer: string;
    date: string;
    amount: number;
    status: 'draft' | 'saved';
    privatelyPaid: boolean;
    project: string;
    bommelEmoji: string;
    purpose: string;
    dueDate: string;
    tags: string[];
    reference: string;
    documentId: number | null;
}

export type ReceiptStatusCheck = 'isDraft' | 'isSaved';

export interface ReceiptFiltersState {
    search: string;
    startDate: string | null;
    endDate: string | null;
    project: string | null;
    status: {
        draft: boolean;
        unassigned: boolean;
    };
    displayAll: boolean;
}

export type FilterKey = keyof ReceiptFiltersState;

export type SetFilterFn = <K extends FilterKey>(key: K, value: ReceiptFiltersState[K]) => void;
