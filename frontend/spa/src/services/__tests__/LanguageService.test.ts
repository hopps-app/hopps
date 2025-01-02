import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import languageService from '@/services/LanguageService';
import i18n from '@/i18n.ts';

describe('LanguageService', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.spyOn(i18n, 'changeLanguage');
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('should initialize with default language if no language is set in localStorage', () => {
        languageService.init();
        expect(i18n.changeLanguage).toHaveBeenCalledWith('en');
    });

    it('should initialize with language from localStorage if it is set', () => {
        localStorage.setItem('LANG', 'fr');
        languageService.init();
        expect(i18n.changeLanguage).toHaveBeenCalledWith('fr');
    });

    it('should return the current language', () => {
        i18n.language = 'es';
        expect(languageService.getLanguage()).toBe('es');
    });

    it('should set the language and update localStorage', () => {
        languageService.setLanguage('de');
        expect(localStorage.getItem('LANG')).toBe('de');
        expect(i18n.changeLanguage).toHaveBeenCalledWith('de');
    });
});
