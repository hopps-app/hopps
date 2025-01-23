import { AxiosInstance } from 'axios';

import { InvoicesTableData } from '@/components/InvoicesTable/types';
import { TransactionRecord } from '@/services/api/types/TransactionRecord.ts';
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
            date: transaction.transactionTime,
        }));
    }

    async reassignTransaction(bommelId: number, transactionId: number): Promise<unknown> {
        const url = `${import.meta.env.VITE_INVOICES_SERVICE_URL || this.baseUrl}/${transactionId}/bommel?bommelId=${bommelId}`;
        const response = await this.axiosInstance.patch(url);

        return response.data;
    }

    async uploadInvoice(file: File, bommelId: number) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('bommelId', bommelId + '');
        //
        // await this.axiosInstance.post(`${import.meta.env.VITE_INVOICES_SERVICE_URL || this.baseUrl}/upload`, formData, {
        //     headers: {
        //         'Content-Type': 'multipart/form-data',
        //     },
        // });

        // @todo remove after testing
        return new Promise((resolve, reject) => {
            setTimeout(reject, 2000);
        });
    }
}
