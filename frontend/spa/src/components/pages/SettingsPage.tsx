import { useCallback, useState } from 'react';

import { RadioGroup, RadioGroupItem } from '@/components/ui/RadioGroup.tsx';
import { Label } from '@/components/ui/label.tsx';
import themeService, { Themes } from '@/services/ThemeService.ts';

function SettingsPage() {
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
        <div>
            <h1 className="text-center">Settings</h1>

            <hr />

            <div className="mt-4">
                <div className="flex flex-row">
                    <div className="min-w-[200px]">Theme:</div>
                    <div>
                        <RadioGroup defaultValue={theme || 'auto'} className="flex flex-row" onValueChange={onThemeChanged}>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="light" id="r1" />
                                <Label htmlFor="r1">Light</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="dark" id="r2" />
                                <Label htmlFor="r2">Dark</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="auto" id="r3" />
                                <Label htmlFor="r3">Auto</Label>
                            </div>
                        </RadioGroup>
                    </div>
                </div>
                <div className="flex flex-row">
                    <div className="min-w-[200px]">Other settings....</div>
                    <div>...</div>
                </div>
            </div>
        </div>
    );
}

export default SettingsPage;
