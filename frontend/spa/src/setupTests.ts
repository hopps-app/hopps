import * as matchers from '@testing-library/jest-dom/matchers';
import { beforeEach, expect, vi } from 'vitest';

import i18n from '@/i18n.ts';

expect.extend(matchers);

// UI tests assert English copy; keep their language independent of the app default.
beforeEach(async () => {
    await i18n.changeLanguage('en');
});

Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(), // deprecated
        removeListener: vi.fn(), // deprecated
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    }),
});
