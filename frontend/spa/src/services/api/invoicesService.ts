import axios, { AxiosInstance } from 'axios';

import { InvoicesTableData } from '@/components/InvoicesTable/types';
import { TransactionRecord } from '@/services/api/types/TransactionRecord.ts';
import authService from '@/services/auth/AuthService.ts';

export class InvoicesService {
    private axiosInstance: AxiosInstance;

    constructor(private baseUrl: string) {
        this.axiosInstance = axios.create({
            baseURL: this.baseUrl,
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authService.getAuthToken()}` },
        });
    }

    async getInvoices(): Promise<InvoicesTableData[]> {
        const transactions: TransactionRecord[] = [];
        const pageSize = 100;

        let page = 0;

        while (true) {
            const url = `${import.meta.env.VITE_INVOICES_SERVICE_URL || this.baseUrl}/all?page=${page}&size=${pageSize}`;
            const response = await this.axiosInstance.get<TransactionRecord[]>(url);
            const data = response.data;

            if (Array.isArray(data)) {
                transactions.push(...data);
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
    //     const response = await this.axiosInstance.get(url);
    //     return response.data;
    // }
}
