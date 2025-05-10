import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import SettingsPageHeader from '@/components/SettingsPage/SettingsPageHeader.tsx';
import Radio from '@/components/ui/Radio.tsx';
import Select from '@/components/ui/Select.tsx';
import languageService from '@/services/LanguageService.ts';
import themeService, { Themes } from '@/services/ThemeService.ts';

function ProfileSettingsView() {
    const { t } = useTranslation();
    const themes = [
        { label: 'Light', value: 'light' },
        { label: 'Dark', value: 'dark' },
        { label: 'Auto', value: 'auto' },
    ];
    const languages = [
        { label: 'English', value: 'en' },
        { label: 'German', value: 'de' },
        { label: 'Ukrainian', value: 'uk' },
    ];
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
        <>
            <SettingsPageHeader />
            <div>
                <div className="mt-4">
                    <div className="flex flex-row">
                        <div className="min-w-[200px]">{t('profile.settings.theme')}:</div>
                        <div>
                            <Radio items={themes} value={theme || 'auto'} layout="horizontal" onValueChange={onThemeChanged} />
                        </div>
                    </div>
                    <div className="flex flex-row my-2">
                        <div className="min-w-[200px] leading-10">{t('profile.settings.language')}:</div>
                        <div>
                            <Select items={languages} value={currentLanguage} onValueChanged={onLanguageChanged} />
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

export default ProfileSettingsView;
