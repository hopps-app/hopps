import { MatchersV3, PactV3, V3MockServer } from '@pact-foundation/pact';
import path from 'path';
import { describe, expect, it } from 'vitest';
import fs from 'fs';

import { InvoicesService } from '@/services/api/invoicesService';
import { InvoicesTableData } from '@/components/InvoicesTable/types';
import { Transaction } from '@/services/api/types/TransactionRecord.ts';

const provider = new PactV3({
    consumer: 'spa',
    provider: 'fin',
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

    it('uploadInvoice', async () => {
        const fileName = 'test.pdf';
        const filePath = path.resolve(__dirname, `./${fileName}`);
        const fileBuffer = fs.readFileSync(filePath);
        const testFile = new File([fileBuffer], fileName, { type: 'application/pdf' });
        const formDataFieldKey = 'file';

        const bommelId = 123;
        const documentType = Transaction.INVOICE;
        const privatelyPaid = false;

        const formData = new FormData();
        formData.append(formDataFieldKey, testFile);
        formData.append('bommelId', String(bommelId));
        formData.append('type', documentType);
        formData.append('privatelyPaid', String(privatelyPaid));

        return provider
            .given('provider is ready to accept invoice uploads')
            .uponReceiving('a request to upload an invoice')
            .withRequestMultipartFileUpload(
                {
                    method: 'POST',
                    path: '/transaction-record',
                },
                'application/pdf',
                filePath,
                formDataFieldKey
            )
            .willRespondWith({
                status: 202,
                headers: { 'Content-Type': 'application/json' },
                body: {
                    instanceId: MatchersV3.uuid(),
                },
            })
            .executeTest(async (server: V3MockServer) => {
                import.meta.env.VITE_INVOICES_SERVICE_URL = '';
                invoicesService = new InvoicesService(server.url);
                const response = await invoicesService.uploadInvoice(testFile, bommelId, documentType, privatelyPaid);
                expect(response!.status).toEqual(202);
            });
    });
});
