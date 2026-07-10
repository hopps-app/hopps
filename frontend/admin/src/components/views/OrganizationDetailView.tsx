import { ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

import { deleteOrganization, fetchOrganization } from '@/features/organizations/api';
import DeleteDialog from '@/features/organizations/DeleteDialog';
import StatusBadge from '@/features/organizations/StatusBadge';
import { formatDate, formatNumber, formatRelative } from '@/features/organizations/format';
import { deriveStatus } from '@/features/organizations/status';
import type { AdminOrganizationRow } from '@/features/organizations/types';

export default function OrganizationDetailView() {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const numericId = Number(id);

    const [row, setRow] = useState<AdminOrganizationRow | null>(null);
    const [state, setState] = useState<'loading' | 'ready' | 'notfound'>('loading');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        let cancelled = false;
        if (Number.isNaN(numericId)) {
            setState('notfound');
            return;
        }
        fetchOrganization(numericId)
            .then((r) => {
                if (cancelled) return;
                setRow(r);
                setState(r ? 'ready' : 'notfound');
            })
            .catch(() => !cancelled && setState('notfound'));
        return () => {
            cancelled = true;
        };
    }, [numericId]);

    const handleDelete = async () => {
        if (!row) return;
        setDeleting(true);
        try {
            await deleteOrganization(row.id);
            navigate('/organizations');
        } catch (e) {
            console.error('Failed to delete organization:', e);
            setDeleting(false);
        }
    };

    if (state === 'loading') {
        return (
            <div className="flex items-center gap-2.5 text-ink-2">
                <span className="spinner" />
                <span className="text-[14px]">{t('common.loading')}</span>
            </div>
        );
    }

    if (state === 'notfound' || !row) {
        return (
            <div className="fade-up">
                <BackLink label={t('organizations.detail.back')} onClick={() => navigate('/organizations')} />
                <div className="card card--flat p-10 text-center mt-4">
                    <p className="text-[14px] text-ink-2">{t('organizations.detail.notFound')}</p>
                </div>
            </div>
        );
    }

    const locale = i18n.language;
    const info: Array<[string, React.ReactNode]> = [
        [t('organizations.columns.contact'), row.contactEmail ?? '—'],
        [t('organizations.columns.belege'), <span className="tnum">{formatNumber(row.belegeCount)}</span>],
        [t('organizations.columns.lastActivity'), formatRelative(row.lastActivityAt, locale, Date.now()) ?? t('organizations.never')],
        [t('organizations.columns.created'), formatDate(row.createdAt) ?? '—'],
    ];

    return (
        <div className="fade-up max-w-[720px]">
            <BackLink label={t('organizations.detail.back')} onClick={() => navigate('/organizations')} />

            <div className="flex items-center gap-3 mt-4 flex-wrap">
                <h1 className="text-[27px] font-extrabold text-ink">{row.name}</h1>
                <StatusBadge status={deriveStatus(row, Date.now())} />
            </div>
            <p className="text-[14px] text-ink-2 mt-1">{row.slug}</p>

            <div className="card card--flat mt-6 px-[18px] py-1.5">
                {info.map(([k, v], i) => (
                    <div
                        key={i}
                        className="flex items-center justify-between py-3.5"
                        style={{ borderBottom: i < info.length - 1 ? '1px solid var(--line)' : 'none' }}
                    >
                        <span className="text-[13.5px] font-semibold text-ink-2">{k}</span>
                        <span className="text-[14px] font-bold text-ink">{v}</span>
                    </div>
                ))}
            </div>

            {/* Danger zone */}
            <div className="mt-8 rounded-card p-5" style={{ border: '1px solid var(--neg)', background: 'var(--neg-bg)' }}>
                <h2 className="text-[15px] font-bold text-neg-ink">{t('organizations.delete.zoneTitle')}</h2>
                <p className="text-[13.5px] text-ink-2 mt-1 mb-4">{t('organizations.delete.zoneText')}</p>
                <button type="button" className="btn btn--danger" onClick={() => setDialogOpen(true)}>
                    {t('organizations.delete.confirm')}
                </button>
            </div>

            {dialogOpen && (
                <DeleteDialog confirmText={row.name} busy={deleting} onConfirm={handleDelete} onClose={() => setDialogOpen(false)} />
            )}
        </div>
    );
}

function BackLink({ label, onClick }: { label: string; onClick: () => void }) {
    return (
        <button type="button" onClick={onClick} className="flex items-center gap-1.5 text-[13.5px] font-semibold text-ink-2 hover:text-ink transition-colors">
            <ArrowLeft size={16} />
            {label}
        </button>
    );
}
