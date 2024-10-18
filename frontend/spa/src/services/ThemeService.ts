enum Themes {
    light = 'light',
    dark = 'dark',
}

export class ThemeService {
    private localStorageKey = 'theme';
    private currentTheme: string = Themes.light;

    init() {
        const isDarkMode =
            localStorage.theme === Themes.dark || (!(this.localStorageKey in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);

        document.documentElement.classList.toggle(Themes.dark, isDarkMode);
        this.currentTheme = isDarkMode ? Themes.dark : Themes.light;
    }

    setDarkMode(isDarkMode = false) {
        const theme = isDarkMode ? Themes.dark : Themes.light;
        document.documentElement.classList.toggle(Themes.dark, isDarkMode);
        localStorage.setItem(this.localStorageKey, theme);
        this.currentTheme = theme;
    }

    getTheme() {
        return this.currentTheme;
    }
}

const themeService = new ThemeService();
export default themeService;
