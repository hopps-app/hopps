import { ArrowLeft, Trash2, UserCog } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

import { deleteOrganization, fetchOrganization } from '@/features/organizations/api';
import BelegeChart from '@/features/organizations/BelegeChart';
import DeleteDialog from '@/features/organizations/DeleteDialog';
import ExtractionChart from '@/features/organizations/ExtractionChart';
import ImpersonateDialog from '@/features/organizations/ImpersonateDialog';
import LoginActivityChart from '@/features/organizations/LoginActivityChart';
import StatusBadge from '@/features/organizations/StatusBadge';
import TokenTrendChart from '@/features/organizations/TokenTrendChart';
import { formatDate } from '@/features/organizations/format';
import { deriveStatus } from '@/features/organizations/status';
import type { OrganizationDetail, OrgAddress, OrgMember } from '@/features/organizations/types';

type Modal = 'none' | 'delete' | 'impersonate';

export default function OrganizationDetailView() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const numericId = Number(id);

    const [org, setOrg] = useState<OrganizationDetail | null>(null);
    const [state, setState] = useState<'loading' | 'ready' | 'notfound'>('loading');
    const [modal, setModal] = useState<Modal>('none');
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
                setOrg(r);
                setState(r ? 'ready' : 'notfound');
            })
            .catch(() => !cancelled && setState('notfound'));
        return () => {
            cancelled = true;
        };
    }, [numericId]);

    const handleDelete = async () => {
        if (!org) return;
        setDeleting(true);
        try {
            await deleteOrganization(org.id);
            navigate('/organizations');
        } catch (e) {
            console.error('Failed to delete organization:', e);
            setDeleting(false);
        }
    };

    if (state === 'loading') {
        return (
            <div className="flex flex-col items-center justify-center gap-3 text-ink-2 min-h-[60vh]">
                <span className="spinner" />
                <span className="text-[14px]">{t('common.loading')}</span>
            </div>
        );
    }

    if (state === 'notfound' || !org) {
        return (
            <div className="fade-up">
                <BackLink label={t('organizations.detail.back')} onClick={() => navigate('/organizations')} />
                <div className="card card--flat p-10 text-center mt-4">
                    <p className="text-[14px] text-ink-2">{t('organizations.detail.notFound')}</p>
                </div>
            </div>
        );
    }

    const dash = '—';
    // Tolerate non-strings: a JSON value can arrive as a number/object, and calling
    // .trim() on it would throw. Coerce to string, treat empty/nullish as the dash.
    const val = (v: unknown) => {
        if (v === null || v === undefined) return dash;
        const s = String(v);
        return s.trim() !== '' ? s : dash;
    };

    return (
        <div className="fade-up pb-10">
            <BackLink label={t('organizations.detail.back')} onClick={() => navigate('/organizations')} />

            {/* Header: identity + primary action */}
            <div className="flex items-start justify-between gap-4 mt-4 flex-wrap">
                <div className="min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                        <h1 className="text-[27px] font-extrabold text-ink">{org.name}</h1>
                        <StatusBadge status={deriveStatus(org, Date.now())} />
                    </div>
                    <p className="text-[14px] text-ink-2 mt-1">{org.slug}</p>
                </div>
                <div className="flex items-center gap-2.5 flex-shrink-0">
                    <button type="button" className="btn btn--brand" onClick={() => setModal('impersonate')}>
                        <UserCog size={16} />
                        {t('organizations.impersonate.action')}
                    </button>
                    <button type="button" className="btn btn--danger" onClick={() => setModal('delete')}>
                        <Trash2 size={16} />
                        {t('organizations.delete.confirm')}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-6 items-start">
                <div className="flex flex-col gap-5">
                    {/* Stammdaten — includes address & phone */}
                    <Section title={t('organizations.detail.stammdaten')}>
                        <Field label={t('organizations.fields.type')} value={val(org.type)} />
                        <Field label={t('organizations.fields.foundingDate')} value={org.foundingDate ? formatDate(org.foundingDate) ?? dash : dash} />
                        <Field label={t('organizations.fields.registrationCourt')} value={val(org.registrationCourt)} />
                        <Field label={t('organizations.fields.registrationNumber')} value={val(org.registrationNumber)} />
                        <Field label={t('organizations.fields.taxNumber')} value={val(org.taxNumber)} />
                        <Field label={t('organizations.fields.address')} value={formatAddress(org.address, dash)} />
                        <Field label={t('organizations.fields.country')} value={val(org.country)} />
                        <Field label={t('organizations.fields.phone')} value={val(org.phoneNumber)} />
                        <Field label={t('organizations.fields.website')} value={val(org.website)} last />
                    </Section>

                    {/* Members — below Stammdaten */}
                    <Section title={t('organizations.detail.members', { count: org.members.length })}>
                        {org.members.length === 0 ? (
                            <p className="py-3.5 text-[13.5px] text-ink-2">{t('organizations.members.empty')}</p>
                        ) : (
                            org.members.map((m, i) => (
                                <MemberRow key={m.id} member={m} last={i === org.members.length - 1} />
                            ))
                        )}
                    </Section>
                </div>

                {/* Aktivität — usage charts. Beleg-Verbrauch and Beleg-Auslese share a row
                    (side by side) between Login-Aktivität above and Token-Verbrauch below. */}
                <div className="flex flex-col gap-5">
                    <LoginActivityChart activity={org.loginActivity} />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
                        <BelegeChart series={org.belegePerMonth} total={org.belegeCount} />
                        <ExtractionChart breakdown={org.extractionBreakdown} />
                    </div>
                    <TokenTrendChart series={org.tokensPerMonth} />
                </div>
            </div>

            {modal === 'delete' && (
                <DeleteDialog confirmText={org.name} busy={deleting} onConfirm={handleDelete} onClose={() => setModal('none')} />
            )}
            {modal === 'impersonate' && <ImpersonateDialog name={org.name} onClose={() => setModal('none')} />}
        </div>
    );
}

/** One grouped card of label/value rows, heading inside the card. */
function Section({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
    return (
        <div className={`card px-[18px] pt-4 pb-1.5 ${className ?? ''}`}>
            <div className="eyebrow mb-1">{title}</div>
            {children}
        </div>
    );
}

function Field({ label, value, last }: { label: string; value: React.ReactNode; last?: boolean }) {
    return (
        <div className="flex items-center justify-between gap-4 py-3.5" style={{ borderBottom: last ? 'none' : '1px solid var(--line)' }}>
            <span className="text-[13.5px] font-semibold text-ink-2 shrink-0">{label}</span>
            <span className="text-[14px] font-bold text-ink text-right min-w-0 truncate">{value}</span>
        </div>
    );
}

/** A member row: avatar initials + name + email. */
function MemberRow({ member, last }: { member: OrgMember; last: boolean }) {
    const initials = `${member.firstName.charAt(0)}${member.lastName.charAt(0)}`.toUpperCase();
    return (
        <div className="flex items-center gap-3 py-3" style={{ borderBottom: last ? 'none' : '1px solid var(--line)' }}>
            <span
                className="flex-shrink-0 w-9 h-9 rounded-full grid place-items-center text-[12px] font-bold"
                style={{ background: 'var(--pp-tint2)', color: 'var(--pp-ink)' }}
            >
                {initials}
            </span>
            <div className="min-w-0">
                <div className="text-[14px] font-bold text-ink truncate">
                    {member.firstName} {member.lastName}
                </div>
                <div className="text-[12.5px] text-ink-2 truncate">{member.email}</div>
            </div>
        </div>
    );
}


function formatAddress(a: OrgAddress | null, dash: string): string {
    if (!a) return dash;
    const line1 = [a.street, a.number].filter(Boolean).join(' ');
    const line2 = [a.plz, a.city].filter(Boolean).join(' ');
    const full = [line1, a.additionalLine, line2].filter((s) => s && s.trim() !== '').join(', ');
    return full || dash;
}

function BackLink({ label, onClick }: { label: string; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="flex items-center gap-1.5 text-[13.5px] font-semibold text-ink-2 hover:text-ink transition-colors"
        >
            <ArrowLeft size={16} />
            {label}
        </button>
    );
}
