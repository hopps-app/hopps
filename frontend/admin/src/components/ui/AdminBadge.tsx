import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/utils';

type AdminBadgeProps = {
    className?: string;
};

/**
 * Marks the app as the admin surface, alongside the `hopps` wordmark.
 * Shape follows spa's AlphaBadge; purple rather than amber, since amber
 * carries the distinct "alpha version" meaning over there.
 */
export default function AdminBadge({ className }: AdminBadgeProps) {
    const { t } = useTranslation();

    return (
        <span
            className={cn(
                'inline-flex items-center rounded-full border border-purple-300 bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700 dark:border-purple-500 dark:bg-purple-300 dark:text-purple-900',
                className
            )}
        >
            {t('brand.admin')}
        </span>
    );
}
