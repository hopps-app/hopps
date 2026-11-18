import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchAllTransactions } from '../useTransactions';

import apiService from '@/services/ApiService';

vi.mock('@/services/ApiService', () => ({
    default: { orgService: { transactionsAll: vi.fn() } },
}));

const transactionsAll = vi.mocked(apiService.orgService.transactionsAll);
const PAGE_INDEX_ARG = 5;
const PAGE_SIZE_ARG = 8;

const page = (length: number) => Array.from({ length }, (_, id) => ({ id })) as never;

describe('fetchAllTransactions', () => {
    beforeEach(() => transactionsAll.mockReset());

    it('keeps loading until a page comes back short', async () => {
        transactionsAll.mockResolvedValueOnce(page(200)).mockResolvedValueOnce(page(200)).mockResolvedValueOnce(page(3));

        const rows = await fetchAllTransactions();

        expect(rows).toHaveLength(403);
        expect(transactionsAll.mock.calls.map((call) => call[PAGE_INDEX_ARG])).toEqual([0, 1, 2]);
        expect(transactionsAll.mock.calls[0][PAGE_SIZE_ARG]).toBe(200);
    });

    it('stops after one request when nothing matches', async () => {
        transactionsAll.mockResolvedValueOnce(page(0));

        await expect(fetchAllTransactions()).resolves.toEqual([]);
        expect(transactionsAll).toHaveBeenCalledTimes(1);
    });
});
