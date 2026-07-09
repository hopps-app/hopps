import { useTranslation } from 'react-i18next';

type Props = {
    password: string;
};

// Returns a strength level from 1 (weak) to 4 (strong). 0 means empty.
function getStrengthLevel(password: string): number {
    if (!password) return 0;

    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    // Passwords shorter than the minimum can never read as more than "weak".
    if (password.length < 8) return 1;

    return Math.min(4, Math.max(1, score - 1));
}

// All colors are drawn from the existing brand palette (destructive red + purple shades).
const SEGMENT_COLORS: Record<number, string> = {
    1: 'bg-destructive',
    2: 'bg-[var(--purple-300)]',
    3: 'bg-[var(--purple-500)]',
    4: 'bg-[var(--purple-700)]',
};

const LEVEL_KEYS: Record<number, string> = {
    1: 'validation.passwordStrength.weak',
    2: 'validation.passwordStrength.fair',
    3: 'validation.passwordStrength.good',
    4: 'validation.passwordStrength.strong',
};

export function PasswordStrengthMeter({ password }: Props) {
    const { t } = useTranslation();
    const level = getStrengthLevel(password);

    if (!password) return null;

    return (
        <div className="mt-1.5" aria-live="polite">
            <div className="flex gap-1">
                {[1, 2, 3, 4].map((segment) => (
                    <span key={segment} className={`h-1 flex-1 rounded-full transition-colors ${segment <= level ? SEGMENT_COLORS[level] : 'bg-separator'}`} />
                ))}
            </div>
            <p className="mt-1 text-xs text-muted">
                {t('validation.passwordStrength.label')}: {t(LEVEL_KEYS[level])}
            </p>
        </div>
    );
}
