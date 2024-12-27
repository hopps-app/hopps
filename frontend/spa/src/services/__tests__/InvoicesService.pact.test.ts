import { PactV3, V3MockServer } from '@pact-foundation/pact';
import path from 'path';
import { describe, expect, it } from 'vitest';

import { InvoicesService } from '@/services/api/invoicesService';
import { InvoicesTableData } from '@/components/InvoicesTable/types';

const provider = new PactV3({
    consumer: 'InvoicesConsumer',
    provider: 'InvoicesProvider',
    port: 1234,
    dir: path.resolve(process.cwd(), '../../pacts'),
    logLevel: 'error',
});

describe('InvoicesService Pact tests', () => {
    let invoicesService: InvoicesService;

    it.skip('getInvoices', async () => {
        const expectedInvoices: InvoicesTableData[] = [
            {
                id: '1',
                date: '2023-01-01',
                bommel: 'Bommel1',
                creditor: 'Creditor A',
                submitter: 'Submitter A',
                amount: 100,
            },
            {
                id: '2',
                date: '2023-02-01',
                bommel: 'Bommel1',
                creditor: 'Creditor B',
                submitter: 'Submitter B',
                amount: 200,
            },
            {
                id: '3',
                date: '2023-03-01',
                bommel: 'Bommel1',
                creditor: 'Creditor C',
                submitter: 'Submitter C',
                amount: 300,
            },
            {
                id: '4',
                date: '2023-04-01',
                bommel: 'Bommel1',
                creditor: 'Creditor D',
                submitter: 'Submitter D',
                amount: 400,
            },
            {
                id: '5',
                date: '2023-05-01',
                bommel: 'Bommel1',
                creditor: 'Creditor E',
                submitter: 'Submitter E',
                amount: 500,
            },
            {
                id: '6',
                date: '2023-06-01',
                bommel: 'Bommel1',
                creditor: 'Creditor F',
                submitter: 'Submitter F',
                amount: 600,
            },
            {
                id: '7',
                date: '2023-07-01',
                bommel: 'Bommel1',
                creditor: 'Creditor G',
                submitter: 'Submitter G',
                amount: 700,
            },
            {
                id: '8',
                date: '2023-08-01',
                bommel: 'Bommel2',
                creditor: 'Creditor H',
                submitter: 'Submitter H',
                amount: 800,
            },
            {
                id: '9',
                date: '2023-09-01',
                bommel: 'Bommel2',
                creditor: 'Creditor I',
                submitter: 'Submitter I',
                amount: 900,
            },
            {
                id: '10',
                date: '2023-10-01',
                bommel: 'Bommel2',
                creditor: 'Creditor J',
                submitter: 'Submitter J',
                amount: 1000,
            },
        ];
        provider.addInteraction({
            uponReceiving: 'a request for invoices',
            withRequest: {
                method: 'GET',
                path: '/all',
            },
            willRespondWith: {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
                body: expectedInvoices,
            },
        });

        await provider.executeTest(async (server: V3MockServer) => {
            // @ts-expect-error expected
            import.meta.env.VITE_INVOICES_SERVICE_URL = '';
            invoicesService = new InvoicesService(server.url);
            const invoices = await invoicesService.getInvoices();
            expect(invoices).toEqual(expectedInvoices);
        });
    });
});
