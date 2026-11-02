import { Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PublicUploadView } from '../PublicUploadView';

import { renderWithProviders, screen, userEvent, waitFor } from '@/test/test-utils';

const fetchMock = vi.hoisted(() => vi.fn());

// The real generated client: its checks on the form fields decide whether a request goes out at all.
vi.mock('@/services/ApiService', async () => {
    const { Client } = await import('@hopps/api-client');
    return { default: { orgService: new Client('http://api.test', { fetch: fetchMock }) } };
});

function json(status: number, body: unknown) {
    return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

async function renderAndSubmit(comment?: string) {
    const user = userEvent.setup();
    renderWithProviders(
        <Routes>
            <Route path="/upload/:token" element={<PublicUploadView />} />
        </Routes>
    );
    await screen.findByRole('heading', { name: /Sommerfest/ });

    const fileInput = document.querySelector('input[type=file][multiple]') as HTMLInputElement;
    await user.upload(fileInput, new File(['%PDF'], 'beleg.pdf', { type: 'application/pdf' }));
    await user.type(screen.getByRole('textbox', { name: /Your name/ }), 'Anna');
    if (comment) await user.type(screen.getByRole('textbox', { name: /Comment/ }), comment);
    await user.click(screen.getByRole('button', { name: 'Submit receipt' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    return fetchMock.mock.calls[1];
}

describe('PublicUploadView', () => {
    beforeEach(() => {
        localStorage.clear();
        window.history.pushState({}, '', '/upload/token');
        fetchMock.mockReset();
        fetchMock.mockImplementation(async (_url: string, init: RequestInit) =>
            init.method === 'POST'
                ? json(201, { fileName: 'beleg.pdf' })
                : json(200, { organizationName: 'Verein', bommelName: 'Sommerfest', expiresAt: '2030-01-01T00:00:00Z' })
        );
    });

    it('submits a receipt without a comment', async () => {
        const [url, init] = await renderAndSubmit();

        expect(url).toBe('http://api.test/public/upload-links/token');
        expect((init.body as FormData).get('comment')).toBe('');
        expect(await screen.findByText('Thank you!')).toBeInTheDocument();
    });

    it('sends the comment when there is one', async () => {
        const [, init] = await renderAndSubmit('Getränke');

        expect((init.body as FormData).get('comment')).toBe('Getränke');
    });
});
