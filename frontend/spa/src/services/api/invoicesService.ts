import { AxiosInstance } from 'axios';

import { InvoicesTableData } from '@/components/InvoicesTable/types';
import { TransactionRecord, TransactionType } from '@/services/api/types/TransactionRecord.ts';
import axiosService from '@/services/AxiosService.ts';

export class InvoicesService {
    private readonly axiosInstance: AxiosInstance;

    constructor(private readonly baseUrl: string) {
        this.axiosInstance = axiosService.create(this.baseUrl);
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
            name: transaction.name,
            date: transaction.transactionTime,
        }));
    }

    async reassignTransaction(bommelId: number, transactionId: number): Promise<unknown> {
        const url = `${import.meta.env.VITE_INVOICES_SERVICE_URL || this.baseUrl}/${transactionId}/bommel?bommelId=${bommelId}`;
        const response = await this.axiosInstance.patch(url);

        return response.data;
    }

    async uploadInvoice(file: File, bommelId: number, type: TransactionType, privatelyPaid: boolean) {
        if (!(file instanceof File)) return;

        const formData = new FormData();

        formData.append('file', file);
        formData.append('bommelId', String(bommelId));
        formData.append('type', type);
        formData.append('privatelyPaid', String(privatelyPaid));

        return await this.axiosInstance.post(`${import.meta.env.VITE_INVOICES_SERVICE_URL || this.baseUrl}/transaction-record`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
    }
}
