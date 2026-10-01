import type { Organization } from '@hopps/api-client';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { useCurrency } from '../use-currency';

import i18n from '@/i18n';
import { useStore } from '@/store/store';

const normalise = (value: string) => value.replace(/\s/g, ' ');

describe('useCurrency', () => {
    beforeEach(async () => {
        useStore.setState({ organization: null });
        await i18n.changeLanguage('de');
    });

    it('defaults to euro while no organization is loaded', () => {
        const { result } = renderHook(() => useCurrency());
        expect(result.current.currency).toBe('EUR');
        expect(result.current.symbol).toBe('€');
        expect(normalise(result.current.format(10))).toBe('10,00 €');
    });

    it('switches everything at once when the organization is kept in francs', () => {
        useStore.setState({ organization: { currency: 'CHF' } as Organization });
        const { result } = renderHook(() => useCurrency());
        expect(result.current.currency).toBe('CHF');
        expect(result.current.symbol).toBe('CHF');
        expect(normalise(result.current.format(10))).toBe('10,00 CHF');
        expect(result.current.formatCompact(12_345)).toBe('12.3k CHF');
    });

    it('re-renders when the organization currency changes', () => {
        const { result } = renderHook(() => useCurrency());
        expect(result.current.currency).toBe('EUR');
        act(() => {
            useStore.setState({ organization: { currency: 'CHF' } as Organization });
        });
        expect(result.current.currency).toBe('CHF');
    });
});
