import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ThemeService, Themes } from '../ThemeService';

describe('ThemeService', () => {
    let service: ThemeService;

    beforeEach(() => {
        service = new ThemeService();
        localStorage.clear();
        document.documentElement.classList.remove(Themes.dark);
    });

    it('should initialize with light theme by default', () => {
        service.init();
        expect(service.getTheme()).toBe(Themes.light);
        expect(document.documentElement.classList.contains(Themes.dark)).toBe(false);
    });

    it('should initialize with dark theme if localStorage has dark theme', () => {
        localStorage.setItem('THEME', Themes.dark);
        service.init();
        expect(service.getTheme()).toBe(Themes.dark);
        expect(document.documentElement.classList.contains(Themes.dark)).toBe(true);
    });

    it('should set dark mode correctly', () => {
        service.setDarkMode(true);
        expect(service.getTheme()).toBe(Themes.dark);
        expect(document.documentElement.classList.contains(Themes.dark)).toBe(true);
    });

    it('should set light mode correctly', () => {
        service.setDarkMode(false);
        expect(service.getTheme()).toBe(Themes.light);
        expect(document.documentElement.classList.contains(Themes.dark)).toBe(false);
    });

    it('should enable auto mode by clearing preference and reinitializing', () => {
        localStorage.setItem('THEME', Themes.dark);
        const initSpy = vi.spyOn(service, 'init');

        service.setAutoMode();

        expect(localStorage.getItem('THEME')).toBeNull();
        expect(initSpy).toHaveBeenCalledTimes(1);
        expect(service.isAutoMode()).toBe(true);

        initSpy.mockRestore();
    });

    it('should report auto mode status based on stored preference', () => {
        expect(service.isAutoMode()).toBe(true);

        localStorage.setItem('THEME', Themes.light);

        expect(service.isAutoMode()).toBe(false);
    });
});
