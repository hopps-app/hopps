import { ApiException } from '@hopps/api-client';
import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PublicUploadView } from '../PublicUploadView';

import apiService from '@/services/ApiService';
import { renderWithProviders } from '@/test/test-utils';

vi.mock('@/services/ApiService', () => ({
    default: {
        orgService: {
            getPublicUploadLink: vi.fn(),
            submitPublicReceipt: vi.fn(),
        },
    },
}));

const submit = vi.mocked(apiService.orgService.submitPublicReceipt);

function pdf(name = 'receipt.pdf') {
    return new File(['%PDF'], name, { type: 'application/pdf' });
}

async function renderPage() {
    renderWithProviders(<PublicUploadView />);
    await screen.findByText('Sommerfest');
}

async function chooseFiles(...files: File[]) {
    fireEvent.change(screen.getByTestId('public-upload-file-input'), { target: { files } });
    // react-dropzone reads the picked files asynchronously
    await screen.findByText(files[files.length - 1].name);
}

function sendWithName(name = 'Erika Muster') {
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: name } });
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));
}

describe('PublicUploadView', () => {
    beforeEach(() => {
        submit.mockReset();
        vi.mocked(apiService.orgService.getPublicUploadLink).mockResolvedValue({
            organizationName: 'Test e.V.',
            bommelName: 'Sommerfest',
        } as never);
        submit.mockResolvedValue({ fileName: 'receipt.pdf' } as never);
    });

    it('submits a receipt without a comment', async () => {
        await renderPage();
        await chooseFiles(pdf());
        sendWithName();

        await screen.findByText(/thank you/i);
        expect(submit).toHaveBeenCalledTimes(1);
        const [, file, name, comment, privatelyPaid] = submit.mock.calls[0];
        expect(file?.fileName).toBe('receipt.pdf');
        expect(name).toBe('Erika Muster');
        expect(comment).toBeUndefined();
        expect(privatelyPaid).toBe(false);
    });

    it('takes files dropped onto the upload area', async () => {
        await renderPage();
        const dropzone = screen.getByTestId('public-upload-dropzone');
        const files = [pdf('a.pdf'), new File(['x'], 'notes.txt', { type: 'text/plain' })];
        fireEvent.drop(dropzone, { dataTransfer: { files, items: files.map((f) => ({ kind: 'file', type: f.type, getAsFile: () => f })), types: ['Files'] } });

        expect(await screen.findByText('a.pdf')).toBeInTheDocument();
        expect(screen.getByText('notes.txt')).toBeInTheDocument();
        expect(screen.getByText(/only png, jpeg or pdf/i)).toBeInTheDocument();
    });

    it('says so when the server cannot be reached', async () => {
        submit.mockRejectedValue(new TypeError('Failed to fetch'));
        await renderPage();
        await chooseFiles(pdf());
        sendWithName();

        expect(await screen.findByText(/no connection to the server/i)).toBeInTheDocument();
        expect(screen.getByRole('alert')).toHaveTextContent(/1 receipt could not be uploaded/i);
    });

    it('tells a server error apart from a rejected receipt', async () => {
        submit.mockRejectedValueOnce(new ApiException('boom', 503, '', {}, null)).mockRejectedValueOnce(new ApiException('bad', 400, '', {}, null));
        await renderPage();
        await chooseFiles(pdf('a.pdf'), pdf('b.pdf'));
        sendWithName();

        expect(await screen.findByText(/went wrong on our side/i)).toBeInTheDocument();
        expect(screen.getByText(/receipt was not accepted/i)).toBeInTheDocument();
        expect(screen.getByRole('alert')).toHaveTextContent(/2 receipts could not be uploaded/i);
    });
});
