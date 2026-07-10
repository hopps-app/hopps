import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { fetchOrganizations } from '@/features/organizations/api';
import OrganizationsTable from '@/features/organizations/OrganizationsTable';
import type { AdminOrganizationRow } from '@/features/organizations/types';

/** Newest first — the default question an admin list answers is "what registered recently". */
function byCreatedAtDesc(a: AdminOrganizationRow, b: AdminOrganizationRow): number {
    // Rows without a createdAt sort last rather than winning the comparison by accident.
    if (a.createdAt === null && b.createdAt === null) return 0;
    if (a.createdAt === null) return 1;
    if (b.createdAt === null) return -1;
    return b.createdAt.localeCompare(a.createdAt);
}

export default function OrganizationsView() {
    const { t } = useTranslation();
    const [rows, setRows] = useState<AdminOrganizationRow[] | null>(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        let cancelled = false;

        fetchOrganizations()
            .then((page) => {
                if (!cancelled) {
                    setRows(page.rows);
                }
            })
            .catch((e) => {
                console.error('Failed to load organizations:', e);
                if (!cancelled) {
                    setFailed(true);
                }
            });

        return () => {
            cancelled = true;
        };
    }, []);

    const sorted = useMemo(() => (rows ? [...rows].sort(byCreatedAtDesc) : null), [rows]);

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h1 className="text-2xl font-semibold text-grey-black dark:text-white">{t('organizations.title')}</h1>
                <p className="mt-1 text-sm text-grey-800">{t('organizations.subtitle')}</p>
            </div>

            {failed && <p className="text-sm text-destructive">{t('organizations.loadError')}</p>}

            {!failed && sorted === null && <p className="text-sm text-grey-800">{t('common.loading')}</p>}

            {!failed && sorted !== null && <OrganizationsTable rows={sorted} />}
        </div>
    );
}
