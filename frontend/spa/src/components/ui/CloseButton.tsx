import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/utils';

/** Rounded-square close button for drawers: 40 px with an 18 px cross, the design system's icon button. */
export function CloseButton({ onClick, className }: { onClick: () => void; className?: string }) {
    const { t } = useTranslation();
    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={t('common.close')}
            title={t('common.close')}
            className={cn(
                'grid h-10 w-10 flex-shrink-0 place-items-center rounded-[var(--btn-radius)] border border-border-soft bg-[var(--background-secondary)] text-muted-foreground transition-colors hover:border-[var(--border-strong)] hover:text-foreground',
                className
            )}
        >
            <X size={18} />
        </button>
    );
}
