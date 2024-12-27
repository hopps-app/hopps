import { InvoicesTableData } from '@/components/InvoicesTable/types';
import { TransactionRecord } from '@/services/api/types/TransactionRecord.ts';

export class InvoicesService {
    constructor(private baseUrl: string) {}

    async getInvoices(): Promise<InvoicesTableData[]> {
        const transactions: TransactionRecord[] = [];
        const pageSize = 100;

        let page = 0;

        while (true) {
            const url = `${import.meta.env.VITE_INVOICES_SERVICE_URL || this.baseUrl}/all?page=${page}&size=${pageSize}`;
            const response = await fetch(url, { method: 'GET' });
            const data = (await response.json()) as TransactionRecord[];

            if (Array.isArray(data)) {
                data.forEach((transaction) => {
                    transactions.push(transaction);
                });
                if (data.length < pageSize) {
                    break;
                }
            } else {
                break;
            }

            page++;
        }

        return transactions.map((transaction) => ({
            id: transaction.id,
            amount: transaction.total,
            bommel: transaction.bommelId,
            date: transaction.transactionTime,
        }));
    }

    // async getInvoicesByBommel(bommelId: number): Promise<InvoicesTableData[]> {
    //     const url = `${import.meta.env.VITE_INVOICES_SERVICE_URL || this.baseUrl}/all`;
    //     const response = await fetch(url, { method: 'GET' });
    //     return response.json();
    // }
}
