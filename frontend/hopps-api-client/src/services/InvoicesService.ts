import { AxiosInstance } from 'axios';
import { AxiosServiceOptions, createAxiosService } from '../AxiosService';
import { TransactionRecord, TransactionType } from '../types/TransactionRecord';

export class InvoicesService {
    private readonly axiosInstance: AxiosInstance;

    constructor(options: AxiosServiceOptions) {
        this.axiosInstance = createAxiosService(options)
    }

    async getInvoices(): Promise<any[]> {
        const transactions: TransactionRecord[] = [];
        const pageSize = 100;

        let page = 0;

        while (true) {
            const url = `/all?page=${page}&size=${pageSize}`;
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
        const url = `/${transactionId}/bommel?bommelId=${bommelId}`;
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

        return await this.axiosInstance.post(`/transaction-record`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
    }
}
