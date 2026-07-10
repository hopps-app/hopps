import { Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { fetchOrganizations } from '@/features/organizations/api';
import OrganizationsTable, { type SortDir, type SortKey } from '@/features/organizations/OrganizationsTable';
import OrganizationsTableSkeleton from '@/features/organizations/OrganizationsTableSkeleton';
import { formatNumber } from '@/features/organizations/format';
import type { AdminOrganizationRow } from '@/features/organizations/types';

/** Compares one sort key, nulls always last regardless of direction. */
function compare(a: AdminOrganizationRow, b: AdminOrganizationRow, key: SortKey): number {
    const av = a[key];
    const bv = b[key];
    if (av === null && bv === null) return 0;
    if (av === null) return 1;
    if (bv === null) return -1;
    if (typeof av === 'number' && typeof bv === 'number') return av - bv;
    return String(av).localeCompare(String(bv));
}

export default function OrganizationsView() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [rows, setRows] = useState<AdminOrganizationRow[] | null>(null);
    const [failed, setFailed] = useState(false);
    const [query, setQuery] = useState('');
    const [sortKey, setSortKey] = useState<SortKey>('createdAt');
    const [sortDir, setSortDir] = useState<SortDir>('desc');

    useEffect(() => {
        let cancelled = false;
        fetchOrganizations()
            .then((page) => !cancelled && setRows(page.rows))
            .catch((e) => {
                console.error('Failed to load organizations:', e);
                if (!cancelled) setFailed(true);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const handleSort = (key: SortKey) => {
        if (key === sortKey) {
            setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortKey(key);
            // Text defaults A→Z; counts and dates default high/newest first.
            setSortDir(key === 'name' ? 'asc' : 'desc');
        }
    };

    const visible = useMemo(() => {
        if (!rows) return null;
        const q = query.trim().toLowerCase();
        const filtered = q
            ? rows.filter(
                  (r) =>
                      r.name.toLowerCase().includes(q) ||
                      r.slug.toLowerCase().includes(q) ||
                      (r.contactEmail?.toLowerCase().includes(q) ?? false)
              )
            : rows;
        const sorted = [...filtered].sort((a, b) => compare(a, b, sortKey));
        return sortDir === 'asc' ? sorted : sorted.reverse();
    }, [rows, query, sortKey, sortDir]);

    const subtitle =
        visible === null
            ? t('organizations.subtitle')
            : t('organizations.count', { count: visible.length, formatted: formatNumber(visible.length) });

    return (
        <div className="fade-up">
            {/* PageHeader */}
            <div className="flex items-start justify-between gap-5 mb-[22px] flex-wrap">
                <div>
                    <h1 className="text-[27px] font-extrabold text-ink">{t('organizations.title')}</h1>
                    <p className="text-[14.5px] text-ink-2 mt-[5px]">{subtitle}</p>
                </div>
            </div>

            {/* Toolbar */}
            <div className="flex items-center gap-2.5 mb-3.5 flex-wrap">
                <div className="relative flex-1 min-w-[220px]">
                    <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none" />
                    <input
                        className="input input--prefix"
                        placeholder={t('organizations.searchPlaceholder')}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                </div>
            </div>

            {failed ? (
                <div className="card card--flat p-10 text-center">
                    <p className="text-[13.5px] text-neg-ink">{t('organizations.loadError')}</p>
                </div>
            ) : visible === null ? (
                <OrganizationsTableSkeleton />
            ) : visible.length === 0 ? (
                <div className="card card--flat px-6 py-14 text-center flex flex-col items-center gap-2">
                    <Search size={30} className="text-ink-3" strokeWidth={1.7} />
                    <p className="text-[15px] font-bold text-ink">{t('organizations.emptyTitle')}</p>
                    <p className="text-[13.5px] text-ink-2">{t('organizations.emptyText')}</p>
                </div>
            ) : (
                <OrganizationsTable
                    rows={visible}
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={handleSort}
                    onRowClick={(row) => navigate(`/organizations/${row.id}`)}
                />
            )}
        </div>
    );
}
