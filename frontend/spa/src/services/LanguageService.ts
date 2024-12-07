import i18n from '@/i18n.ts';

export class LanguageService {
    private localStorageKey = 'LANG';

    public init() {
        const lang = localStorage.getItem(this.localStorageKey) || i18n.language;
        i18n.changeLanguage(lang);
    }

    public getLanguage() {
        return i18n.language;
    }

    public setLanguage(lang: string) {
        localStorage.setItem(this.localStorageKey, lang);
        i18n.changeLanguage(lang);
    }
}

const languageService = new LanguageService();
export default languageService;
