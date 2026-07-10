import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/utils';

type AdminBadgeProps = {
    className?: string;
};

/**
 * Marks the app as the admin surface, alongside the `hopps` wordmark.
 * Uses the Klar `.badge--purple` pill so it matches badges across the app.
 */
export default function AdminBadge({ className }: AdminBadgeProps) {
    const { t } = useTranslation();

    return <span className={cn('badge badge--purple', className)}>{t('brand.admin')}</span>;
}
