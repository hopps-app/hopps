import { AlertTriangle, Download, Sheet, Tag } from 'lucide-react';
import { ReactNode, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import BommelMultiSelector from '@/components/CategoryGroups/BommelMultiSelector';
import { buildBommelIndex, selfAndAncestorIds } from '@/components/CategoryGroups/helpers';
import { TableEmptyState } from '@/components/common';
import { ReportsSetup } from '@/components/Reports/ReportsSetup';
import { ReportResultSkeleton, ReportsSkeleton } from '@/components/Reports/ReportsSkeleton';
import Button from '@/components/ui/Button';
import { InfoTooltip } from '@/components/ui/InfoTooltip';
import Select from '@/components/ui/Select';
import { useCategoryGroups, useCategoryGroupReport } from '@/hooks/queries/useCategoryGroups';
import { useCurrency } from '@/hooks/use-currency';
import { useEnsureBommels } from '@/hooks/use-ensure-bommels';
import { usePageTitle } from '@/hooks/use-page-title';
import { useBommelsStore } from '@/store/bommels/bommelsStore';

const FONT = '"Hanken Grotesk", "Reddit Sans", sans-serif';

/** "No group" entry of the group select; the Select component does not allow an empty value, group ids are positive. */
const NO_GROUP = '0';

const EMPTY_CARD = 'rounded-[16px] border border-[var(--border-soft)] bg-[var(--background-secondary)]';

/**
 * Native date field like the other date filters in the app (Transaktionen, Konten), with the border and background of
 * the bommel and group fields next to it so the filter card stays uniform.
 */
const DATE_FIELD =
    'h-10 rounded-xl border border-[#E0E0E6] bg-white px-3.5 text-[14px] text-gray-800 transition-colors focus:border-[var(--purple-300)] focus:outline-none focus:ring-2 focus:ring-[var(--purple-50)] dark:border-gray-700 dark:bg-[var(--purple-50)] dark:text-gray-100';

const num = (v: unknown): number => (v == null ? 0 : Number(v));

/**
 * Reports view: aggregate transaction totals by the values of a chosen category group over a transaction-date range.
 * Each value's income, expense and net sum is shown, with overall totals and a CSV export.
 */
export function ReportsView() {
    const { format } = useCurrency();
    const { t } = useTranslation();
    usePageTitle(t('reports.title'));
    useEnsureBommels();

    const { data: groups = [], isLoading: groupsLoading } = useCategoryGroups();
    // undefined = nothing chosen yet, so the first group is shown; null = the user explicitly cleared the selection.
    const [chosenGroupId, setChosenGroupId] = useState<number | null | undefined>(undefined);
    const groupId = chosenGroupId === undefined ? groups[0]?.id : (chosenGroupId ?? undefined);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [bommelIds, setBommelIds] = useState<number[]>([]);
    const allBommels = useBommelsStore((st) => st.allBommels);

    // The bommels the chosen group applies to: those assigned to it and everything below them (with the root, all).
    const groupBommelIds = useMemo(() => {
        const assigned = new Set(groups.find((g) => g.id === groupId)?.bommelIds ?? []);
        const byId = buildBommelIndex(allBommels);
        return new Set(allBommels.filter((b) => b.id != null && [...selfAndAncestorIds(b.id, byId)].some((id) => assigned.has(id))).map((b) => b.id as number));
    }, [groups, groupId, allBommels]);

    // A bommel selection only makes sense within one group's scope, so changing the group starts from all its bommels.
    const pickGroup = (id: number | null) => {
        setChosenGroupId(id);
        setBommelIds([]);
    };

    const { data: report, isLoading, isError } = useCategoryGroupReport(groupId, startDate, endDate, bommelIds);
    const rows = report?.rows ?? [];

    const totals = useMemo(() => {
        const income = num(report?.totalIncome);
        const expense = num(report?.totalExpense);
        return { income, expense, net: income - expense, count: report?.totalCount ?? 0 };
    }, [report]);
    const maxRowValue = Math.max(1, ...rows.map((r) => Math.max(num(r.income), num(r.expense))));

    function exportCsv() {
        if (!report || rows.length === 0) {
            return;
        }
        const header = [t('reports.table.value'), t('reports.table.count'), t('reports.table.income'), t('reports.table.expense'), t('reports.table.net')];
        const cell = (v: string | number) => {
            const s = String(v);
            return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        };
        const body = rows.map((r) => [r.value ?? '', r.count ?? 0, num(r.income), num(r.expense), num(r.income) - num(r.expense)]);
        body.push([t('reports.total'), totals.count, totals.income, totals.expense, totals.net]);
        const csv = [header, ...body].map((row) => row.map(cell).join(';')).join('\r\n');
        // BOM so Excel reads UTF-8 (umlauts) correctly
        const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const range = [startDate, endDate].filter(Boolean).join('_');
        a.download = `bericht_${report.groupName ?? groupId}${range ? '_' + range : ''}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }

    // Until the groups are known it is unclear whether the setup or the report applies, so show the page shape.
    if (groupsLoading) {
        return <ReportsSkeleton />;
    }

    // First use: without a category group there is nothing to group the report by yet.
    if (groups.length === 0) {
        return (
            <div className="flex flex-col h-full min-h-0" style={{ fontFamily: FONT }}>
                <ReportsHeader />
                <ReportsSetup />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full min-h-0" style={{ fontFamily: FONT }}>
            <ReportsHeader />

            {/* Filters, laid out as in the design: Bommel and Kategoriegruppe, then the period with the export on the right. All
                fields share the BaseInput look and height, like the bommel picker next to them. */}
            <div className="flex flex-col gap-[18px] rounded-[var(--r-card)] border border-[var(--border-soft)] bg-[var(--background-secondary)] px-[22px] py-5">
                <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(230px,1fr))]">
                    <FilterField label={t('reports.bommel')}>
                        <BommelMultiSelector
                            value={bommelIds}
                            onChange={setBommelIds}
                            allowedIds={groupBommelIds}
                            placeholder={t('reports.allGroupBommels')}
                            emptyText={t('reports.noGroupBommels')}
                        />
                    </FilterField>
                    <FilterField label={t('reports.group')}>
                        <Select
                            value={groupId != null ? String(groupId) : NO_GROUP}
                            onValueChanged={(v) => pickGroup(v === NO_GROUP ? null : Number(v))}
                            items={[{ label: t('reports.selectGroup'), value: NO_GROUP }, ...groups.map((g) => ({ label: g.name ?? '', value: String(g.id) }))]}
                        />
                    </FilterField>
                </div>
                {/* Same columns as the row above: the period sits under Bommel with each date taking half, the export under the group. */}
                <div className="grid items-end gap-4 [grid-template-columns:repeat(auto-fit,minmax(230px,1fr))]">
                    <FilterField label={t('reports.setup.period')} info={t('reports.periodHint')}>
                        <div className="flex items-center gap-2.5">
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                aria-label={t('reports.from')}
                                className={`${DATE_FIELD} min-w-0 flex-1`}
                            />
                            <span className="shrink-0 text-[13px] text-[var(--ink-faint)]">{t('reports.until')}</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                aria-label={t('reports.to')}
                                className={`${DATE_FIELD} min-w-0 flex-1`}
                            />
                        </div>
                    </FilterField>
                    <Button size="sm" className="h-10 justify-self-end" onClick={exportCsv} disabled={!report || rows.length === 0}>
                        <Download />
                        {t('reports.exportCsv')}
                    </Button>
                </div>
            </div>

            {/* Results */}
            <div className="flex-1 min-h-0 mt-4">
                {!groupId ? (
                    <div className={EMPTY_CARD}>
                        <TableEmptyState icon={Tag} title={t('reports.emptyNoGroup.title')} text={t('reports.emptyNoGroup.description')} />
                    </div>
                ) : isLoading ? (
                    <ReportResultSkeleton />
                ) : isError ? (
                    <div className={EMPTY_CARD}>
                        <TableEmptyState icon={AlertTriangle} title={t('reports.error.title')} text={t('reports.error.description')} />
                    </div>
                ) : rows.length === 0 ? (
                    <div className={EMPTY_CARD}>
                        <TableEmptyState icon={Sheet} title={t('reports.emptyNoData.title')} text={t('reports.emptyNoData.description')} />
                    </div>
                ) : (
                    <div className="overflow-hidden rounded-[var(--r-card)] border border-[var(--border-soft)] bg-[var(--background-secondary)]">
                        {/* The totals live once, in this header, each above its own column (same widths as the table below). */}
                        <div className="overflow-x-auto border-b border-[var(--border-soft)]">
                            <table className="w-full table-fixed border-collapse">
                                <tbody>
                                    <tr>
                                        <td className="w-[55%] px-4 py-4">
                                            <div className="text-[15.5px] font-extrabold text-foreground">{report?.groupName}</div>
                                            <div className="mt-0.5 text-[13px] text-muted-foreground">{t('reports.bookings', { count: totals.count })}</div>
                                        </td>
                                        <HeaderFigure label={t('reports.table.income')} value={format(totals.income)} className="text-[var(--positive)]" />
                                        <HeaderFigure label={t('reports.table.expense')} value={format(totals.expense)} />
                                        <HeaderFigure label={t('reports.table.net')} value={format(totals.net)} className={netColor(totals.net)} last />
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full table-fixed border-collapse text-sm">
                                <thead>
                                    <tr className="text-xs uppercase tracking-[0.04em] text-[var(--ink-faint)]">
                                        <th className="w-[24%] px-4 py-[11px] text-left font-extrabold">{t('reports.table.value')}</th>
                                        <th className="w-[20%] px-2.5 py-[11px] text-left font-extrabold">{t('reports.table.distribution')}</th>
                                        <th className="w-[11%] px-2.5 py-[11px] text-right font-extrabold">{t('reports.table.count')}</th>
                                        <th className="w-[15%] px-2.5 py-[11px] text-right font-extrabold">{t('reports.table.income')}</th>
                                        <th className="w-[15%] px-2.5 py-[11px] text-right font-extrabold">{t('reports.table.expense')}</th>
                                        <th className="w-[15%] px-4 py-[11px] text-right font-extrabold">{t('reports.table.net')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((r, i) => {
                                        const income = num(r.income);
                                        const expense = num(r.expense);
                                        const net = income - expense;
                                        return (
                                            <tr key={r.value ?? i} className="border-t border-[var(--border-soft)]">
                                                <td className="truncate px-4 py-[13px] font-bold text-foreground">{r.value}</td>
                                                <td className="px-2.5 py-[13px]">
                                                    <div className="flex flex-col gap-1">
                                                        <Bar value={income} max={maxRowValue} className="bg-[var(--positive)]" />
                                                        <Bar value={expense} max={maxRowValue} className="bg-[var(--primary)]" />
                                                    </div>
                                                </td>
                                                <td className="px-2.5 py-[13px] text-right tabular-nums text-muted-foreground">{r.count}</td>
                                                <td className="px-2.5 py-[13px] text-right tabular-nums text-foreground">{income ? format(income) : '—'}</td>
                                                <td className="px-2.5 py-[13px] text-right tabular-nums text-foreground">{expense ? format(expense) : '—'}</td>
                                                <td className={`px-4 py-[13px] text-right font-extrabold tabular-nums ${netColor(net)}`}>{format(net)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

/** Balance colour: green when positive, red only when negative. Expenses themselves stay neutral. */
function netColor(net: number): string {
    return net < 0 ? 'text-[var(--negative)]' : 'text-[var(--positive)]';
}

/** One total in the header of the result card, as a cell lined up with its column in the table below. */
function HeaderFigure({ label, value, className, last }: { label: string; value: string; className?: string; last?: boolean }) {
    return (
        <td className={`w-[15%] py-4 text-right ${last ? 'px-4' : 'px-2.5'}`}>
            <div className="text-xs font-bold text-[var(--ink-faint)]">{label}</div>
            <div className={`text-base font-extrabold tabular-nums ${className ?? 'text-foreground'}`}>{value}</div>
        </td>
    );
}

/** Distribution bar relative to the largest income or expense of the report; a non-zero value stays visible. */
function Bar({ value, max, className }: { value: number; max: number; className: string }) {
    const width = value > 0 ? Math.max(4, (value / max) * 100) : 0;
    return <div className={`h-[7px] rounded-full ${className}`} style={{ width: `${width}%` }} />;
}

export default ReportsView;

/** Page title; what the page does is explained in a tooltip next to it. */
function ReportsHeader() {
    const { t } = useTranslation();
    return (
        <h1 className="mb-5 flex items-center gap-2 font-bold leading-tight text-foreground" style={{ fontSize: 26 }}>
            {t('reports.title')}
            <InfoTooltip content={t('reports.subtitle')} label={t('reports.subtitle')} size={17} />
        </h1>
    );
}

/** Filter label above its control, as in the design (12px, extra bold, uppercase). */
function FilterField({ label, info, children }: { label: string; info?: string; children: ReactNode }) {
    return (
        <div className="flex min-w-0 flex-col gap-[7px]">
            <span className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-[0.04em] text-[var(--ink-faint)]">
                {label}
                {info && <InfoTooltip content={info} label={info} size={14} className="normal-case tracking-normal" />}
            </span>
            {children}
        </div>
    );
}
