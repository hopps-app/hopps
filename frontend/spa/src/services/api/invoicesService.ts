import { InvoicesTableData } from '@/components/InvoicesTable/types';

export class InvoicesService {
    constructor(private baseUrl: string) {}

    async getInvoices(): Promise<InvoicesTableData[]> {
        const url = `${import.meta.env.VITE_INVOICES_SERVICE_URL || this.baseUrl}/invoices`;
        const response = await fetch(url, { method: 'GET' });
        return response.json();
    }
}
