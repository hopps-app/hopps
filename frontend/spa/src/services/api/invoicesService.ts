import { InvoicesTableData } from '@/components/InvoicesTable/types';

export class InvoicesService {
    constructor(private baseUrl: string) {}

    async getInvoices(): Promise<InvoicesTableData[]> {
        // const response = await fetch(`${this.baseUrl}/invoices`, { method: 'GET' });
        // return response.json();

        //test data
        const testData = [
            {
                date: '2023-01-01',
                bommel: 'Bommel1',
                creditor: 'Creditor A',
                submitter: 'Submitter A',
                amount: 100,
            },
            {
                date: '2023-02-01',
                bommel: 'Bommel1',
                creditor: 'Creditor B',
                submitter: 'Submitter B',
                amount: 200,
            },
            {
                date: '2023-03-01',
                bommel: 'Bommel1',
                creditor: 'Creditor C',
                submitter: 'Submitter C',
                amount: 300,
            },
            {
                date: '2023-04-01',
                bommel: 'Bommel1',
                creditor: 'Creditor D',
                submitter: 'Submitter D',
                amount: 400,
            },
            {
                date: '2023-05-01',
                bommel: 'Bommel1',
                creditor: 'Creditor E',
                submitter: 'Submitter E',
                amount: 500,
            },
            {
                date: '2023-06-01',
                bommel: 'Bommel1',
                creditor: 'Creditor F',
                submitter: 'Submitter F',
                amount: 600,
            },
            {
                date: '2023-07-01',
                bommel: 'Bommel1',
                creditor: 'Creditor G',
                submitter: 'Submitter G',
                amount: 700,
            },
            {
                date: '2023-08-01',
                bommel: 'Bommel2',
                creditor: 'Creditor H',
                submitter: 'Submitter H',
                amount: 800,
            },
            {
                date: '2023-09-01',
                bommel: 'Bommel2',
                creditor: 'Creditor I',
                submitter: 'Submitter I',
                amount: 900,
            },
            {
                date: '2023-10-01',
                bommel: 'Bommel2',
                creditor: 'Creditor J',
                submitter: 'Submitter J',
                amount: 1000,
            },
        ];
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve(testData);
            }, 1000);
        });
    }
}
