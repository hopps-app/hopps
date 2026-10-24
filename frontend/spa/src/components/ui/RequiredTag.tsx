import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/utils';

/**
 * Small grey "Pflicht" pill next to the label of a required form field. Deliberately neutral: a field that is still
 * empty is marked by its orange border, so the tag stays the same whether the field is filled or not. Optional fields
 * carry no tag. Resets case and tracking so it reads the same under an uppercase label.
 */
export function RequiredTag({ className }: { className?: string }) {
    const { t } = useTranslation();
    return (
        <span
            className={cn(
                'inline-flex items-center rounded-full bg-[var(--surface-track)] px-2 py-0.5 text-[10.5px] font-bold normal-case tracking-normal text-muted-foreground',
                className
            )}
        >
            {t('categoryGroups.required')}
        </span>
    );
}
