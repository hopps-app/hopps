import { ArrowLeft, ChevronDown, LayoutGrid, MoreHorizontal, Trash2, UserCog } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

import DropdownMenu, { DropdownMenuItem } from '@/components/ui/DropdownMenu';
import { deleteOrganization, fetchOrganization } from '@/features/organizations/api';
import BelegeChart from '@/features/organizations/BelegeChart';
import DeleteDialog from '@/features/organizations/DeleteDialog';
import ExtractionChart from '@/features/organizations/ExtractionChart';
import LoginActivityChart from '@/features/organizations/LoginActivityChart';
import StatusBadge from '@/features/organizations/StatusBadge';
// Hidden for now — restore alongside the <TokenTrendChart /> usage below:
// import TokenTrendChart from '@/features/organizations/TokenTrendChart';
import { formatMonthYear } from '@/features/organizations/format';
import { deriveStatus } from '@/features/organizations/status';
import type { OrganizationDetail, OrgAddress, OrgMember } from '@/features/organizations/types';
import { cn } from '@/lib/utils';

type Modal = 'none' | 'delete';

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

    // Organization-level actions, behind the header's "Aktionen" menu. Only deletion exists today;
    // the menu is the place further org actions land rather than growing the header a button at a time.
    const orgActions: DropdownMenuItem[] = [
        {
            title: t('organizations.delete.confirm'),
            description: t('organizations.delete.hint'),
            tone: 'danger',
            icon: <Trash2 size={17} />,
            onClick: () => setModal('delete'),
        },
    ];

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
                </div>
                <div className="flex items-center gap-2.5 flex-shrink-0">
                    <DropdownMenu items={orgActions} className="w-72 p-1.5">
                        <button type="button" className="btn btn--neutral">
                            <LayoutGrid size={16} />
                            {t('organizations.detail.actions')}
                            <ChevronDown size={16} />
                        </button>
                    </DropdownMenu>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-6 items-start">
                <div className="flex flex-col gap-5">
                    {/* Stammdaten — registration details first, then how to reach them, then tenure. */}
                    <Section title={t('organizations.detail.stammdaten')}>
                        <Field label={t('organizations.fields.type')} value={val(org.type)} />
                        <Field label={t('organizations.fields.address')} value={<AddressValue address={org.address} dash={dash} />} />
                        <Field label={t('organizations.fields.phone')} value={val(org.phoneNumber)} />
                        <Field
                            label={t('organizations.fields.website')}
                            value={org.website ? <LinkValue href={websiteHref(org.website)} text={websiteLabel(org.website)} /> : dash}
                        />
                        <Field
                            label={t('organizations.fields.email')}
                            value={org.contactEmail ? <LinkValue href={`mailto:${org.contactEmail}`} text={org.contactEmail} /> : dash}
                        />
                        <Field label={t('organizations.fields.customerSince')} value={formatMonthYear(org.createdAt) ?? dash} last />
                    </Section>

                    {/* Vorstand & Zugänge — the people with access to this Verein */}
                    <Section
                        title={t('organizations.detail.vorstand')}
                        action={<span className="badge badge--neutral">{t('organizations.members.count', { count: org.members.length })}</span>}
                        className="pb-5"
                    >
                        {org.members.length === 0 ? (
                            <p className="py-3.5 text-[13.5px] text-ink-2">{t('organizations.members.empty')}</p>
                        ) : (
                            <div className="flex flex-col gap-2 mt-3">
                                {org.members.map((m) => (
                                    <MemberRow key={m.id} member={m} />
                                ))}
                            </div>
                        )}
                    </Section>
                </div>

                {/* Aktivität — usage charts, three vertically stacked: Login-Aktivität, then
                    Beleg-Verbrauch (count), then Beleg-Auslese (extraction) beneath it.
                    Token-Verbrauch is hidden for now (see commented TokenTrendChart below). */}
                <div className="flex flex-col gap-5">
                    <LoginActivityChart activity={org.loginActivity} />
                    <BelegeChart series={org.belegePerMonth} total={org.belegeCount} />
                    <ExtractionChart breakdown={org.extractionBreakdown} />
                    {/* Hidden for now — restore to bring back the Token-Verbrauch chart:
                    <TokenTrendChart series={org.tokensPerMonth} /> */}
                </div>
            </div>

            {modal === 'delete' && (
                <DeleteDialog confirmText={org.name} busy={deleting} onConfirm={handleDelete} onClose={() => setModal('none')} />
            )}
        </div>
    );
}

/** One grouped card of label/value rows, heading inside the card, with an optional right-hand slot. */
function Section({
    title,
    action,
    children,
    className,
}: {
    title: string;
    action?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={cn('card px-[18px] pt-4 pb-1.5', className)}>
            <div className="flex items-center justify-between gap-3 mb-1">
                <div className="eyebrow">{title}</div>
                {action}
            </div>
            {children}
        </div>
    );
}

function Field({ label, value, last }: { label: string; value: React.ReactNode; last?: boolean }) {
    return (
        <div className="flex items-start justify-between gap-4 py-3.5" style={{ borderBottom: last ? 'none' : '1px solid var(--line)' }}>
            <span className="text-[13.5px] font-semibold text-ink-2 shrink-0">{label}</span>
            {/* Wraps rather than truncating: an address is two lines by design, and a long registration
                number or e-mail is worth reading in full more than it is worth one tidy row. */}
            <span className="text-[14px] font-bold text-ink text-right min-w-0 break-words">{value}</span>
        </div>
    );
}

/** Street/number and postcode/city on their own lines, the way an address is actually written. */
function AddressValue({ address, dash }: { address: OrgAddress | null; dash: string }) {
    const lines = addressLines(address);
    if (lines.length === 0) {
        return <>{dash}</>;
    }
    return (
        <>
            {lines.map((line, i) => (
                <div key={i}>{line}</div>
            ))}
        </>
    );
}

/** Website and e-mail values, in the Klar accent so they read as actionable. */
function LinkValue({ href, text }: { href: string; text: string }) {
    const external = href.startsWith('http');
    return (
        <a
            href={href}
            {...(external ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
            className="hover:underline"
            style={{ color: 'var(--pp-ink)' }}
        >
            {text}
        </a>
    );
}

/** Stored websites may omit the scheme, which would make the href relative to the admin app. */
function websiteHref(website: string): string {
    return /^https?:\/\//i.test(website) ? website : `https://${website}`;
}

/** Shown without scheme or trailing slash — the domain is the informative part. */
function websiteLabel(website: string): string {
    return website.replace(/^https?:\/\//i, '').replace(/\/+$/, '');
}

/**
 * A member row: avatar initials + name + email, with a per-member action menu.
 *
 * The subtitle is the e-mail rather than a board role ("Kassenwart", "1. Vorsitzende"): the backend
 * `Member` has only firstName/lastName/email/keycloakId, so there is no role to show yet.
 */
function MemberRow({ member }: { member: OrgMember }) {
    const { t } = useTranslation();
    const initials = `${member.firstName.charAt(0)}${member.lastName.charAt(0)}`.toUpperCase();
    const fullName = `${member.firstName} ${member.lastName}`.trim();

    // Both actions are intentionally inert for now. Impersonation needs Keycloak admin-API access and
    // an audit log before it can be switched on (see ImpersonateDialog), and there is no endpoint for
    // removing a member from an organization yet.
    const actions: DropdownMenuItem[] = [
        {
            title: t('organizations.members.impersonate'),
            description: t('organizations.members.impersonateHint'),
            icon: <UserCog size={17} />,
            onClick: () => {},
        },
        {
            title: t('organizations.members.delete'),
            description: t('organizations.members.deleteHint'),
            tone: 'danger',
            icon: <Trash2 size={17} />,
            onClick: () => {},
        },
    ];

    return (
        <div className="flex items-center gap-3 rounded-xl px-3 py-2.5" style={{ background: 'var(--surface-2)' }}>
            <span
                className="flex-shrink-0 w-9 h-9 rounded-[10px] grid place-items-center text-[12px] font-bold"
                style={{ background: 'var(--pp-tint2)', color: 'var(--pp-ink)' }}
            >
                {initials}
            </span>
            <div className="min-w-0 flex-1">
                <div className="text-[14px] font-bold text-ink truncate">{fullName}</div>
                <div className="text-[12.5px] text-ink-2 truncate">{member.email}</div>
            </div>
            <DropdownMenu items={actions} className="w-72 p-1.5">
                {/* Deliberately not `.icbtn` — that is a white bordered circle, which reads as a primary
                    control sitting on top of the row rather than a quiet affordance inside it. */}
                <button
                    type="button"
                    className="flex-shrink-0 w-8 h-8 grid place-items-center rounded-lg text-ink-2 hover:text-ink hover:bg-black/5 transition-colors"
                    aria-label={t('organizations.members.actions', { name: fullName })}
                >
                    <MoreHorizontal size={18} />
                </button>
            </DropdownMenu>
        </div>
    );
}


/** Address split into display lines: street + number, any additional line, then postcode + city. */
function addressLines(a: OrgAddress | null): string[] {
    if (!a) return [];
    const street = [a.street, a.number].filter(Boolean).join(' ');
    const city = [a.plz, a.city].filter(Boolean).join(' ');
    return [street, a.additionalLine ?? '', city].map((s) => s.trim()).filter((s) => s !== '');
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
