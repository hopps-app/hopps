import { Check, ChevronDown, Languages } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import DropdownMenu, { type DropdownMenuItem } from '@/components/ui/DropdownMenu';
import { cn } from '@/lib/utils';
import languageService from '@/services/LanguageService';

/** Each language in its own name, so someone who cannot read the current one still finds theirs. */
const LANGUAGES = [
    { code: 'de', name: 'Deutsch' },
    { code: 'en', name: 'English' },
    { code: 'fr', name: 'Français' },
    { code: 'it', name: 'Italiano' },
] as const;

/**
 * Language switch for the public pages, where nobody can reach the profile settings yet. The choice is stored the
 * same way as there (see LanguageService), so it also applies after logging in.
 */
export function LanguageSelector({ className }: { className?: string }) {
    const { t, i18n } = useTranslation();
    const current = (i18n.resolvedLanguage ?? i18n.language ?? 'en').split('-')[0];
    const currentName = LANGUAGES.find(({ code }) => code === current)?.name ?? current;

    const items = useMemo<DropdownMenuItem[]>(
        () =>
            LANGUAGES.map(({ code, name }) => ({
                title: name,
                onClick: () => languageService.setLanguage(code),
                // Takes its space on every entry, so the names line up.
                icon: <Check className={cn('h-4 w-4', code === current ? 'opacity-100' : 'opacity-0')} aria-hidden="true" />,
            })),
        [current]
    );

    return (
        <DropdownMenu items={items} className="w-44">
            <button
                type="button"
                aria-label={`${t('profile.languageLabel')}: ${currentName}`}
                className={cn(
                    'flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-black/5 dark:hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--purple-300)]',
                    className
                )}
            >
                <Languages className="h-4 w-4" aria-hidden="true" />
                <span>{currentName}</span>
                <ChevronDown className="h-4 w-4 opacity-60" aria-hidden="true" />
            </button>
        </DropdownMenu>
    );
}

export default LanguageSelector;
