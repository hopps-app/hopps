import { Download, TrendingUp } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import BommelMultiSelector from '@/components/CategoryGroups/BommelMultiSelector';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingState } from '@/components/common/LoadingState/LoadingState';
import { useCategoryGroups, useCategoryGroupReport } from '@/hooks/queries/useCategoryGroups';
import { usePageTitle } from '@/hooks/use-page-title';

const FONT = '"Hanken Grotesk", "Reddit Sans", sans-serif';

const num = (v: unknown): number => (v == null ? 0 : Number(v));

function fmtCurrency(value: number): string {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
}

/**
 * Reports view: aggregate transaction totals by the values of a chosen category group over a transaction-date range.
 * Each value's income, expense and net sum is shown, with overall totals and a CSV export.
 */
export function ReportsView() {
    const { t } = useTranslation();
    usePageTitle(t('reports.title'));

    const { data: groups = [], isLoading: groupsLoading } = useCategoryGroups();
    const [groupId, setGroupId] = useState<number | undefined>(undefined);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [bommelIds, setBommelIds] = useState<number[]>([]);

    const { data: report, isLoading, isError } = useCategoryGroupReport(groupId, startDate, endDate, bommelIds);
    const rows = report?.rows ?? [];

    const totals = useMemo(() => {
        const income = num(report?.totalIncome);
        const expense = num(report?.totalExpense);
        return { income, expense, net: income - expense, count: report?.totalCount ?? 0 };
    }, [report]);

    const inputCls =
        'rounded-[10px] border border-[#E9E9EE] bg-white px-3 py-2 text-[13.5px] text-[#1B1B1F] focus:outline-none focus:ring-2 focus:ring-[#F3EAFB] focus:border-[#9955CC] transition-colors';
    const labelCls = 'text-[11px] font-bold text-[#9A9AA3] uppercase tracking-[0.06em]';

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

    return (
        <div className="flex flex-col h-full min-h-0" style={{ fontFamily: FONT }}>
            {/* Header */}
            <div className="mb-5">
                <h1 className="font-bold text-[#1B1B1F] leading-tight" style={{ fontSize: 26 }}>
                    {t('reports.title')}
                </h1>
                <p className="mt-1 text-[13.5px] text-[#6B6B76] max-w-2xl">{t('reports.subtitle')}</p>
            </div>

            {/* Controls */}
            <div className="rounded-[16px] border border-[#E9E9EE] bg-white p-4 flex flex-col gap-3">
                <div className="flex flex-wrap items-end gap-3">
                    <div className="flex flex-col gap-1.5 min-w-[220px] flex-1">
                        <label className={labelCls}>{t('reports.group')}</label>
                        <select value={groupId ?? ''} onChange={(e) => setGroupId(e.target.value ? Number(e.target.value) : undefined)} className={inputCls}>
                            <option value="">{t('reports.selectGroup')}</option>
                            {groups.map((g) => (
                                <option key={g.id} value={g.id ?? ''}>
                                    {g.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className={labelCls}>{t('reports.from')}</label>
                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className={labelCls}>{t('reports.to')}</label>
                        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputCls} />
                    </div>
                    <button
                        type="button"
                        onClick={exportCsv}
                        disabled={!report || rows.length === 0}
                        className="inline-flex items-center gap-2 h-[38px] px-4 rounded-[10px] border border-[#E0E0E6] text-[13.5px] font-bold text-[#7E3FB4] hover:bg-[#F3EAFB] hover:border-[#C7A2E3] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <Download size={15} />
                        {t('reports.export')}
                    </button>
                </div>
                <div className="flex flex-col gap-1.5 sm:max-w-md">
                    <label className={labelCls}>{t('reports.bommel')}</label>
                    <BommelMultiSelector value={bommelIds} onChange={setBommelIds} />
                </div>
            </div>

            {/* Results */}
            <div className="flex-1 min-h-0 mt-4">
                {groupsLoading ? (
                    <div className="py-12">
                        <LoadingState size="lg" />
                    </div>
                ) : !groupId ? (
                    <EmptyState title={t('reports.emptyNoGroup.title')} description={t('reports.emptyNoGroup.description')} />
                ) : isLoading ? (
                    <div className="py-12">
                        <LoadingState size="lg" />
                    </div>
                ) : isError ? (
                    <EmptyState title={t('reports.error.title')} description={t('reports.error.description')} />
                ) : rows.length === 0 ? (
                    <EmptyState title={t('reports.emptyNoData.title')} description={t('reports.emptyNoData.description')} />
                ) : (
                    <div className="rounded-[16px] border border-[#E9E9EE] bg-white overflow-hidden">
                        {/* summary cards */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-[#E9E9EE]">
                            <SummaryCell label={t('reports.table.income')} value={fmtCurrency(totals.income)} color="#1F7A50" />
                            <SummaryCell label={t('reports.table.expense')} value={fmtCurrency(totals.expense)} color="#B12C4C" />
                            <SummaryCell label={t('reports.table.net')} value={fmtCurrency(totals.net)} color={totals.net >= 0 ? '#1F7A50' : '#B12C4C'} />
                            <SummaryCell label={t('reports.table.count')} value={String(totals.count)} color="#1B1B1F" />
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-[13.5px]">
                                <thead>
                                    <tr className="text-left text-[#9A9AA3]">
                                        <th className="font-bold uppercase tracking-[0.05em] text-[11px] px-4 py-2.5">{t('reports.table.value')}</th>
                                        <th className="font-bold uppercase tracking-[0.05em] text-[11px] px-4 py-2.5 text-right">{t('reports.table.count')}</th>
                                        <th className="font-bold uppercase tracking-[0.05em] text-[11px] px-4 py-2.5 text-right">
                                            {t('reports.table.income')}
                                        </th>
                                        <th className="font-bold uppercase tracking-[0.05em] text-[11px] px-4 py-2.5 text-right">
                                            {t('reports.table.expense')}
                                        </th>
                                        <th className="font-bold uppercase tracking-[0.05em] text-[11px] px-4 py-2.5 text-right">{t('reports.table.net')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((r, i) => {
                                        const net = num(r.income) - num(r.expense);
                                        return (
                                            <tr key={r.value ?? i} className="border-t border-[#F1F1F4]">
                                                <td className="px-4 py-2.5 font-semibold text-[#1B1B1F]">{r.value}</td>
                                                <td className="px-4 py-2.5 text-right tabular-nums text-[#6B6B76]">{r.count}</td>
                                                <td className="px-4 py-2.5 text-right tabular-nums" style={{ color: num(r.income) ? '#1F7A50' : '#9A9AA3' }}>
                                                    {fmtCurrency(num(r.income))}
                                                </td>
                                                <td className="px-4 py-2.5 text-right tabular-nums" style={{ color: num(r.expense) ? '#B12C4C' : '#9A9AA3' }}>
                                                    {fmtCurrency(num(r.expense))}
                                                </td>
                                                <td
                                                    className="px-4 py-2.5 text-right tabular-nums font-bold"
                                                    style={{ color: net >= 0 ? '#1F7A50' : '#B12C4C' }}
                                                >
                                                    {fmtCurrency(net)}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                <tfoot>
                                    <tr className="border-t-2 border-[#E9E9EE] bg-[#FAFAFC]">
                                        <td className="px-4 py-3 font-bold text-[#1B1B1F]">
                                            <span className="inline-flex items-center gap-1.5">
                                                <TrendingUp size={14} className="text-[#7E3FB4]" />
                                                {t('reports.total')}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right tabular-nums font-bold text-[#1B1B1F]">{totals.count}</td>
                                        <td className="px-4 py-3 text-right tabular-nums font-bold text-[#1F7A50]">{fmtCurrency(totals.income)}</td>
                                        <td className="px-4 py-3 text-right tabular-nums font-bold text-[#B12C4C]">{fmtCurrency(totals.expense)}</td>
                                        <td className="px-4 py-3 text-right tabular-nums font-bold" style={{ color: totals.net >= 0 ? '#1F7A50' : '#B12C4C' }}>
                                            {fmtCurrency(totals.net)}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function SummaryCell({ label, value, color }: { label: string; value: string; color: string }) {
    return (
        <div className="bg-white px-4 py-3">
            <div className="text-[11px] font-bold uppercase tracking-[0.05em] text-[#9A9AA3]">{label}</div>
            <div className="mt-0.5 text-[17px] font-bold tabular-nums" style={{ color }}>
                {value}
            </div>
        </div>
    );
}

export default ReportsView;
