import i18n from '@/i18n.ts';

export class LanguageService {
    private localStorageKey = 'LANG';

    public init() {
        const lang = localStorage.getItem(this.localStorageKey) || i18n.language;
        this.apply(lang);
    }

    public getLanguage() {
        return i18n.language;
    }

    public setLanguage(lang: string) {
        localStorage.setItem(this.localStorageKey, lang);
        this.apply(lang);
    }

    private apply(lang: string) {
        i18n.changeLanguage(lang);
        // So screen readers read the page in that language (index.html starts out with "en").
        document.documentElement.lang = lang;
    }
}

const languageService = new LanguageService();
export default languageService;
