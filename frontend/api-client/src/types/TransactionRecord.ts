export type TransactionRecord = {
    id: number;
    bommelId: number;
    total: number;
    transactionTime: string;
    address?: {
        country: string;
        state: string;
        zipCode: string;
        city: string;
        street: string;
        streetNumber: string;
    };
    name: string;
    orderNumber: string;
    invoiceId: string;
    dueDate: string;
    amountDue: number;
    currencyCode: string;
};

export enum Transaction {
    INVOICE = 'INVOICE',
    RECEIPT = 'RECEIPT',
}

export type TransactionType = Transaction | string;
