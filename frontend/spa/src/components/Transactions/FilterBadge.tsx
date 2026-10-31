import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { FONT } from '@/components/Transactions/layout';

/** Removable badge for one active filter. */
export function FilterBadge({ label, onRemove }: { label: ReactNode; onRemove: () => void }) {
    const { t } = useTranslation();
    return (
        <span
            className="inline-flex cursor-default items-center gap-2 rounded-[var(--btn-radius)] border py-1.5 pl-3 pr-2 text-[13px] font-semibold"
            style={{
                fontFamily: FONT,
                background: 'var(--accent-surface)',
                color: 'var(--purple-700)',
                borderColor: 'color-mix(in oklch, var(--primary) 28%, var(--background-secondary))',
            }}
        >
            {label}
            <button
                type="button"
                aria-label={t('transactions.filters.removeFilter')}
                onClick={onRemove}
                className="grid place-items-center transition-colors hover:text-[var(--negative)]"
            >
                <X size={14} strokeWidth={2.5} />
            </button>
        </span>
    );
}
