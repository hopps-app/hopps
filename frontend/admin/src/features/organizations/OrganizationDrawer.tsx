import { X } from 'lucide-react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import StatusBadge from './StatusBadge';
import { formatDate, formatNumber, formatRelative } from './format';
import { deriveStatus } from './status';
import type { AdminOrganizationRow } from './types';

type OrganizationDrawerProps = {
    row: AdminOrganizationRow;
    onClose: () => void;
};

/**
 * Right-hand detail drawer for one Verein. Shows only the row's own fields — there is no
 * org-detail endpoint yet, so it does not fetch. It's an honest expansion of what the
 * list already knows, and the seam for a real detail load later.
 */
export default function OrganizationDrawer({ row, onClose }: OrganizationDrawerProps) {
    const { t, i18n } = useTranslation();
    const locale = i18n.language;

    // Escape closes the drawer, matching the scrim click.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const rows: Array<[string, React.ReactNode]> = [
        [t('organizations.columns.contact'), row.contactEmail ?? '—'],
        [t('organizations.columns.belege'), <span className="tnum">{formatNumber(row.belegeCount)}</span>],
        [t('organizations.columns.lastActivity'), formatRelative(row.lastActivityAt, locale, Date.now()) ?? t('organizations.never')],
        [t('organizations.columns.created'), formatDate(row.createdAt) ?? '—'],
    ];

    return (
        <>
            <div className="scrim" onClick={onClose} />
            <div className="drawer">
                <div
                    className="sticky top-0 z-[2] flex items-center justify-between px-6 py-5"
                    style={{ background: 'var(--bg)', borderBottom: '1px solid var(--line)' }}
                >
                    <div className="eyebrow">{t('organizations.drawer.eyebrow')}</div>
                    <button type="button" className="icbtn" onClick={onClose} aria-label={t('common.close')}>
                        <X size={18} />
                    </button>
                </div>

                <div className="p-6">
                    <h2 className="text-[20px] font-extrabold text-ink">{row.name}</h2>
                    <div className="text-[13.5px] text-ink-2 mt-0.5">{row.slug}</div>
                    <div className="mt-3">
                        <StatusBadge status={deriveStatus(row, Date.now())} />
                    </div>

                    <div className="card card--flat mt-5 px-[18px] py-1.5">
                        {rows.map(([k, v], i) => (
                            <div
                                key={i}
                                className="flex items-center justify-between py-3"
                                style={{ borderBottom: i < rows.length - 1 ? '1px solid var(--line)' : 'none' }}
                            >
                                <span className="text-[13.5px] font-semibold text-ink-2">{k}</span>
                                <span className="text-[14px] font-bold text-ink">{v}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
}
