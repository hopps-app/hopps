import { describe, it, expect, beforeEach } from 'vitest';
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
        localStorage.setItem('theme', Themes.dark);
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
});
