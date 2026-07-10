import { useTranslation } from 'react-i18next';

import { formatDate, formatRelative } from './format';
import type { AdminOrganizationRow } from './types';

type OrganizationsTableProps = {
    rows: AdminOrganizationRow[];
};

/** Renders an em-dash for values the backend cannot supply yet, so an empty cell never reads as zero. */
function Empty() {
    return <span className="text-grey-600">—</span>;
}

export default function OrganizationsTable({ rows }: OrganizationsTableProps) {
    const { t, i18n } = useTranslation();
    const locale = i18n.language;
    // Read once per render rather than per cell, so every relative time on the
    // page is measured against the same instant.
    const now = Date.now();

    if (rows.length === 0) {
        return (
            <div className="rounded-xl border border-separator bg-background-secondary p-10 text-center">
                <p className="text-sm text-grey-800">{t('organizations.empty')}</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto rounded-xl border border-separator bg-background-secondary">
            <table className="w-full border-collapse text-sm">
                <thead>
                    <tr className="border-b border-separator text-left">
                        <th scope="col" className="px-4 py-3 font-semibold text-grey-900">
                            {t('organizations.columns.organization')}
                        </th>
                        <th scope="col" className="px-4 py-3 font-semibold text-grey-900">
                            {t('organizations.columns.contact')}
                        </th>
                        <th scope="col" className="px-4 py-3 text-right font-semibold text-grey-900">
                            {t('organizations.columns.belege')}
                        </th>
                        <th scope="col" className="px-4 py-3 font-semibold text-grey-900">
                            {t('organizations.columns.lastActivity')}
                        </th>
                        <th scope="col" className="px-4 py-3 font-semibold text-grey-900">
                            {t('organizations.columns.created')}
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row) => {
                        const lastActivity = formatRelative(row.lastActivityAt, locale, now);
                        const created = formatDate(row.createdAt, locale);

                        return (
                            <tr key={row.id} className="border-b border-separator last:border-b-0 transition-colors hover:bg-hover-effect">
                                <td className="px-4 py-3">
                                    <div className="flex flex-col">
                                        <span className="font-medium text-grey-black dark:text-white">{row.name}</span>
                                        <span className="text-xs text-grey-700">{row.slug}</span>
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-grey-900">{row.contactEmail ?? <Empty />}</td>
                                <td className="px-4 py-3 text-right tabular-nums text-grey-900">{row.belegeCount}</td>
                                <td className="px-4 py-3 text-grey-900">
                                    {/* Null means never seen, which is a real answer — not missing data. */}
                                    {lastActivity ?? <span className="text-grey-700">{t('organizations.never')}</span>}
                                </td>
                                <td className="px-4 py-3 text-grey-900">{created ?? <Empty />}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
