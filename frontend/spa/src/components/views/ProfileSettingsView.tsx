import { Languages, Monitor, Moon, Palette, Sun, type LucideIcon } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { CARD } from '@/components/Organization/layout';
import { FONT } from '@/components/Transactions/layout';
import Select from '@/components/ui/Select.tsx';
import { usePageTitle } from '@/hooks/use-page-title';
import { cn } from '@/lib/utils';
import languageService from '@/services/LanguageService.ts';
import themeService, { Themes } from '@/services/ThemeService.ts';
import { useStore } from '@/store/store';

type ThemeChoice = 'light' | 'dark' | 'auto';

const THEME_ICONS: Record<ThemeChoice, LucideIcon> = { light: Sun, dark: Moon, auto: Monitor };

function initials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    return ((parts[0][0] ?? '') + (parts.length > 1 ? (parts[parts.length - 1][0] ?? '') : '')).toUpperCase();
}

/** Same card as on the NGO details page: icon tile, title and an optional note, then the content. */
function SectionCard({ icon, title, note, children }: { icon: React.ReactNode; title: string; note?: string; children: React.ReactNode }) {
    return (
        <section className={`${CARD} px-6 py-[22px] flex flex-col gap-4`}>
            <div className="flex items-center gap-[13px] min-w-0">
                <div className="w-9 h-9 rounded-[10px] bg-[#F1F1F4] text-[#6B6B76] dark:bg-[#26262D] dark:text-[#A0A0AC] grid place-items-center flex-shrink-0">
                    {icon}
                </div>
                <div className="flex flex-col gap-[3px] min-w-0">
                    <span className="text-[16.5px] font-extrabold tracking-[-0.01em] text-[#1B1B1F] dark:text-[#F2F2F5]">{title}</span>
                    {note && <span className="text-[13.5px] text-[#6B6B76] dark:text-[#A0A0AC]">{note}</span>}
                </div>
            </div>
            {children}
        </section>
    );
}

function ProfileSettingsView() {
    const { t } = useTranslation();
    usePageTitle(t('settings.menu.profile'));
    const user = useStore((state) => state.user);

    const themeOptions = useMemo(
        () =>
            (['light', 'dark', 'auto'] as const).map((value) => ({
                value,
                label: t(`profile.themes.${value}`),
                hint: value === 'auto' ? t('profile.themes.autoHint') : undefined,
            })),
        [t]
    );
    const langOptions = useMemo(
        () => [
            { label: t('profile.lang.english'), value: 'en' },
            { label: t('profile.lang.german'), value: 'de' },
            { label: t('profile.lang.ukrainian'), value: 'uk' },
            { label: t('profile.lang.italian'), value: 'it' },
            { label: t('profile.lang.french'), value: 'fr' },
        ],
        [t]
    );
    const [theme, setTheme] = useState<ThemeChoice>(themeService.isAutoMode() ? 'auto' : (themeService.getTheme() as ThemeChoice));
    const [currentLanguage, setCurrentLanguage] = useState(languageService.getLanguage());

    const onThemeChanged = useCallback((value: ThemeChoice) => {
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
        <div className="flex flex-col min-h-full" style={{ fontFamily: FONT }}>
            <header className="-mx-4 sm:-mx-7 mb-[18px] px-4 sm:px-7 pt-1 pb-[18px] border-b border-[#E9E9EE] dark:border-[#2E2E36]">
                <div className="mx-auto w-full max-w-[940px]">
                    <h1 className="text-[27px] font-extrabold tracking-[-0.02em] leading-tight text-[#1B1B1F] dark:text-[#F2F2F5]">
                        {t('settings.menu.profile')}
                    </h1>
                    <p className="mt-[5px] text-[14.5px] text-[#6B6B76] dark:text-[#A0A0AC]">{t('profile.description')}</p>
                </div>
            </header>

            <div className="mx-auto w-full max-w-[940px] flex flex-col gap-[18px] pb-8">
                {/* Account: who is signed in */}
                {user && (
                    <section className={`${CARD} px-6 py-5 flex items-center gap-[18px]`}>
                        <div className="w-[58px] h-[58px] rounded-[16px] bg-[#F3EAFB] text-[#7E3FB4] dark:bg-[#33204A] dark:text-[#C9A6E6] grid place-items-center flex-shrink-0 text-[20px] font-extrabold">
                            {initials(user.name || user.email)}
                        </div>
                        <div className="flex flex-col gap-1 min-w-0">
                            <span className="text-[15px] font-extrabold tracking-[-0.01em] text-[#1B1B1F] dark:text-[#F2F2F5] truncate">
                                {user.name || user.email}
                            </span>
                            {user.name && <span className="text-[13.5px] text-[#6B6B76] dark:text-[#A0A0AC] truncate">{user.email}</span>}
                        </div>
                    </section>
                )}

                {/* Appearance */}
                <SectionCard icon={<Palette size={19} aria-hidden="true" />} title={t('profile.appearance')} note={t('profile.browserOnly')}>
                    <div role="radiogroup" aria-label={t('profile.theme')} className="grid grid-cols-1 sm:grid-cols-3 gap-[14px]">
                        {themeOptions.map((option) => {
                            const Icon = THEME_ICONS[option.value];
                            const selected = theme === option.value;
                            return (
                                <button
                                    key={option.value}
                                    type="button"
                                    role="radio"
                                    aria-checked={selected}
                                    onClick={() => onThemeChanged(option.value)}
                                    className={cn(
                                        'flex items-center gap-3 rounded-[14px] border px-4 py-3.5 text-left transition-colors',
                                        selected
                                            ? 'border-[#9955CC] bg-[#F3EAFB] dark:border-[#AE73DC] dark:bg-[#33204A]'
                                            : 'border-[#E0E0E6] bg-white hover:border-[#9A9AA3] dark:border-[#3A3A44] dark:bg-[#26262D] dark:hover:border-[#5A5A66]'
                                    )}
                                >
                                    <span
                                        className={cn(
                                            'grid h-9 w-9 flex-shrink-0 place-items-center rounded-[10px]',
                                            selected
                                                ? 'bg-white text-[#7E3FB4] dark:bg-[#1C1C21] dark:text-[#D2AEEE]'
                                                : 'bg-[#F1F1F4] text-[#6B6B76] dark:bg-[#1C1C21] dark:text-[#A0A0AC]'
                                        )}
                                    >
                                        <Icon size={18} aria-hidden="true" />
                                    </span>
                                    <span className="flex min-w-0 flex-col">
                                        <span
                                            className={cn(
                                                'text-[14.5px] font-bold',
                                                selected ? 'text-[#7E3FB4] dark:text-[#D2AEEE]' : 'text-[#1B1B1F] dark:text-[#F2F2F5]'
                                            )}
                                        >
                                            {option.label}
                                        </span>
                                        {option.hint && <span className="text-[12.5px] text-[#6B6B76] dark:text-[#A0A0AC]">{option.hint}</span>}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </SectionCard>

                {/* Language */}
                <SectionCard icon={<Languages size={19} aria-hidden="true" />} title={t('profile.language')} note={t('profile.browserOnly')}>
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-[14px]">
                        <div className="col-span-2 md:col-span-3">
                            <Select label={t('profile.languageLabel')} items={langOptions} value={currentLanguage} onValueChanged={onLanguageChanged} />
                        </div>
                    </div>
                </SectionCard>
            </div>
        </div>
    );
}

export default ProfileSettingsView;
