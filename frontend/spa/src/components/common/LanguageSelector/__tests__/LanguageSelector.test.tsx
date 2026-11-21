import { afterEach, describe, expect, it } from 'vitest';

import { LanguageSelector } from '@/components/common/LanguageSelector/LanguageSelector';
import i18n from '@/i18n';
import { renderWithProviders, screen, userEvent } from '@/test/test-utils';

describe('LanguageSelector', () => {
    afterEach(async () => {
        localStorage.removeItem('LANG');
        await i18n.changeLanguage('en');
        document.documentElement.lang = 'en';
    });

    it('shows the current language and lists every language in its own name', async () => {
        renderWithProviders(<LanguageSelector />);

        await userEvent.click(screen.getByRole('button', { name: 'Interface language: English' }));

        expect(screen.getAllByRole('menuitem').map((item) => item.textContent)).toEqual(['Deutsch', 'English', 'Français', 'Italiano']);
    });

    it('switches the interface, remembers the choice and sets the page language', async () => {
        renderWithProviders(<LanguageSelector />);

        await userEvent.click(screen.getByRole('button', { name: 'Interface language: English' }));
        await userEvent.click(screen.getByRole('menuitem', { name: 'Deutsch' }));

        expect(i18n.language).toBe('de');
        expect(localStorage.getItem('LANG')).toBe('de');
        expect(document.documentElement.lang).toBe('de');
        expect(screen.getByRole('button', { name: 'Sprache der Oberfläche: Deutsch' })).toBeInTheDocument();
    });
});
