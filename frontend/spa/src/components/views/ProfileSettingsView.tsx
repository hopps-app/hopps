import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import Radio from '@/components/ui/Radio.tsx';
import Select from '@/components/ui/Select.tsx';
import Header from '@/components/ui/Header.tsx';
import languageService from '@/services/LanguageService.ts';
import themeService, { Themes } from '@/services/ThemeService.ts';

function ProfileSettingsView() {
    const { t } = useTranslation();
    const themeOptions = useMemo(
        () => [
            { label: t('profile.themes.light'), value: 'light' },
            { label: t('profile.themes.dark'), value: 'dark' },
            { label: 'Auto', value: 'auto' },
        ],
        [t]
    );
    const langOptions = useMemo(
        () => [
            { label: t('profile.lang.english'), value: 'en' },
            { label: t('profile.lang.german'), value: 'de' },
            { label: t('profile.lang.ukrainian'), value: 'uk' },
        ],
        [t]
    );
    const [theme, setTheme] = useState(themeService.isAutoMode() ? 'auto' : themeService.getTheme());
    const [currentLanguage, setCurrentLanguage] = useState(languageService.getLanguage());

    const onThemeChanged = useCallback((value: string) => {
        setTheme(value);

        if (value !== 'auto') {
            themeService.setDarkMode(value === Themes.dark);
        } else {
            themeService.setAutoMode();
        }
    }, []);

    const onLanguageChanged = useCallback((value: string) => {
        setCurrentLanguage(value);
        languageService.setLanguage(value);
    }, []);

    return (
        <div className="px-7 py-[2.5rem]">
            <Header title={t('settings.menu.profile')} icon="Avatar" />
            <form className="mt-4 max-w-[880px]">
                <div className="space-y-8">
                    {/* Theme */}
                    <fieldset className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
                        <div className="sm:col-span-2">
                            <Radio items={themeOptions} value={theme} label={t('profile.theme')} layout="horizontal" onValueChange={onThemeChanged} />
                        </div>
                    </fieldset>

                    {/* Language */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
                        <div className="sm:col-span-2">
                            <Select label={t('profile.language')} items={langOptions} value={currentLanguage} onValueChanged={onLanguageChanged} />
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
}

export default ProfileSettingsView;
