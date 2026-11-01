import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useFilterHint } from '../useFilterHint';

const KEY = 'test.filterHint';

describe('useFilterHint', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('stays off on the first visit', () => {
        const { result } = renderHook(() => useFilterHint(true, KEY));
        expect(result.current).toBe(false);
    });

    it('shows on a later visit and ends by itself', () => {
        localStorage.setItem(KEY, '[]');
        const { result } = renderHook(() => useFilterHint(true, KEY));
        expect(result.current).toBe(true);

        act(() => {
            vi.advanceTimersByTime(2000);
        });
        expect(result.current).toBe(false);
    });

    it('waits until the page is ready', () => {
        localStorage.setItem(KEY, '[]');
        const { result, rerender } = renderHook(({ ready }) => useFilterHint(ready, KEY), { initialProps: { ready: false } });
        expect(result.current).toBe(false);

        act(() => {
            vi.advanceTimersByTime(5000);
        });
        rerender({ ready: true });
        expect(result.current).toBe(true);
    });
});
