import { useCallback, useState } from 'react';

import themeService, { Themes } from '@/services/ThemeService.ts';
import Radio from '@/components/ui/Radio.tsx';
import SettingsPageHeader from '@/components/SettingsPage/SettingsPageHeader.tsx';

function ProfileSettingsView() {
    const [themes] = useState([
        { label: 'Light', value: 'light' },
        { label: 'Dark', value: 'dark' },
        { label: 'Auto', value: 'auto' },
    ]);
    const [theme, setTheme] = useState(themeService.isAutoMode() ? 'auto' : themeService.getTheme());

    const onThemeChanged = useCallback((value: string) => {
        setTheme(value);

        if (value !== 'auto') {
            themeService.setDarkMode(value === Themes.dark);
        } else {
            themeService.setAutoMode();
        }
    }, []);

    return (
        <>
            <SettingsPageHeader />
            <div>
                <div className="mt-4">
                    <div className="flex flex-row">
                        <div className="min-w-[200px]">Theme:</div>
                        <div>
                            <Radio items={themes} value={theme || 'auto'} layout="horizontal" onValueChange={onThemeChanged} />
                        </div>
                    </div>
                    <div className="flex flex-row">
                        <div className="min-w-[200px]">Other settings....</div>
                        <div>...</div>
                    </div>
                </div>
            </div>
        </>
    );
}

export default ProfileSettingsView;
