import { ChevronDown, ChevronsUpDown, ChevronUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import StatusBadge from './StatusBadge';
import { formatDate, formatNumber, formatRelative } from './format';
import { deriveStatus } from './status';
import type { AdminOrganizationRow } from './types';

/** Shared grid template so header and rows stay column-aligned.
    Name is widest (name + slug); the rest are near-even so gaps read consistently. */
const GRID = 'minmax(0,2.2fr) 1.3fr 0.9fr 1.1fr 1fr 1fr';

export type SortKey = 'name' | 'belegeCount' | 'lastActivityAt' | 'createdAt';
export type SortDir = 'asc' | 'desc';

type OrganizationsTableProps = {
    rows: AdminOrganizationRow[];
    sortKey: SortKey;
    sortDir: SortDir;
    onSort: (key: SortKey) => void;
    onRowClick: (row: AdminOrganizationRow) => void;
};

/** Em-dash for values the backend cannot supply yet, so an empty cell never reads as zero. */
function Empty() {
    return <span className="text-ink-3">—</span>;
}

export default function OrganizationsTable({ rows, sortKey, sortDir, onSort, onRowClick }: OrganizationsTableProps) {
    const { t, i18n } = useTranslation();
    const locale = i18n.language;
    const now = Date.now();

    const Header = ({ label, col }: { label: string; col?: SortKey }) => {
        const active = col && sortKey === col;
        return (
            <button
                type="button"
                disabled={!col}
                onClick={() => col && onSort(col)}
                className={`flex items-center gap-1.5 uppercase tracking-wider text-xs font-bold transition-colors ${
                    active ? 'text-pp-ink' : 'text-ink-2'
                } ${col ? 'hover:text-ink cursor-pointer' : 'cursor-default'}`}
            >
                <span>{label}</span>
                {/* Sortable columns always show an affordance: neutral until active, then directional. */}
                {col &&
                    (active ? (
                        sortDir === 'asc' ? (
                            <ChevronUp size={13} className="text-pp-ink" />
                        ) : (
                            <ChevronDown size={13} className="text-pp-ink" />
                        )
                    ) : (
                        <ChevronsUpDown size={13} className="text-ink-3" />
                    ))}
            </button>
        );
    };

    return (
        <div className="card overflow-hidden">
            {/* Header row lives inside the same card as the data, on a quiet grey band. */}
            <div
                className="grid items-center px-5 py-3.5"
                style={{ gridTemplateColumns: GRID, gap: 24, background: 'var(--surface-2)', borderBottom: '1px solid var(--line)' }}
            >
                <Header label={t('organizations.columns.organization')} col="name" />
                <Header label={t('organizations.columns.contact')} />
                <Header label={t('organizations.columns.belege')} col="belegeCount" />
                <Header label={t('organizations.columns.lastActivity')} col="lastActivityAt" />
                <Header label={t('organizations.columns.created')} col="createdAt" />
                <Header label={t('organizations.columns.status')} />
            </div>

            {rows.map((row, i) => {
                    const lastActivity = formatRelative(row.lastActivityAt, locale, now);
                    const created = formatDate(row.createdAt);

                    return (
                        <div
                            key={row.id}
                            className="trow"
                            style={{ gridTemplateColumns: GRID, gap: 24, borderBottom: i < rows.length - 1 ? '1px solid var(--line)' : 'none' }}
                            onClick={() => onRowClick(row)}
                        >
                            <div className="min-w-0">
                                <div className="text-[14px] font-bold text-ink truncate">{row.name}</div>
                                <div className="text-[12px] text-ink-2 truncate">{row.slug}</div>
                            </div>
                            <span className="text-[13.5px] text-ink-2 truncate">{row.contactEmail ?? <Empty />}</span>
                            <span className="tnum text-[13.5px] text-ink-2">{formatNumber(row.belegeCount)}</span>
                            <span className="text-[13.5px] text-ink-2">
                                {lastActivity ?? <span className="text-ink-3">{t('organizations.never')}</span>}
                            </span>
                            <span className="tnum text-[13.5px] text-ink-2">{created ?? <Empty />}</span>
                            <span>
                                <StatusBadge status={deriveStatus(row, now)} />
                            </span>
                        </div>
                    );
                })}
        </div>
    );
}
