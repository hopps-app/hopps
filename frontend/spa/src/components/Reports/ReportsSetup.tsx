import { Eye, Sheet, Tag } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { NextStepCard } from '@/components/common';
import Button from '@/components/ui/Button';

/** Sample figures of the greyed-out preview: the four tax spheres of a non-profit with income and expense. */
const SAMPLE_ROWS: { key: string; income: number; expense: number }[] = [
    { key: 'ideal', income: 4820, expense: 1240 },
    { key: 'purpose', income: 1980, expense: 2360 },
    { key: 'assets', income: 640, expense: 341 },
    { key: 'business', income: 1420, expense: 980 },
];

const fmt = (value: number) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);

const card = 'rounded-[var(--r-card)] border border-[var(--border-soft)] bg-[var(--background-secondary)]';

/**
 * First-use state of the reports page (no category group yet): the next step towards a report, and below it a greyed
 * out, non-interactive sample report so it is clear what will appear here.
 */
export function ReportsSetup() {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const totalIncome = SAMPLE_ROWS.reduce((sum, r) => sum + r.income, 0);
    const totalExpense = SAMPLE_ROWS.reduce((sum, r) => sum + r.expense, 0);
    const max = Math.max(...SAMPLE_ROWS.map((r) => Math.max(r.income, r.expense)));

    return (
        <div className="flex flex-col gap-[18px]">
            <NextStepCard
                icon={Sheet}
                title={t('reports.setup.title')}
                text={t('reports.setup.text')}
                action={
                    <Button size="sm" className="h-10" onClick={() => navigate('/admin/categories')}>
                        <Tag />
                        {t('reports.setup.action')}
                    </Button>
                }
            />

            <div className="relative">
                <div aria-hidden="true" className="pointer-events-none select-none opacity-45 saturate-50">
                    <div className={`${card} mb-4 grid gap-4 px-[22px] py-5 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]`}>
                        {[t('reports.bommel'), t('reports.group'), t('reports.setup.period')].map((label) => (
                            <div key={label} className="flex flex-col gap-[7px]">
                                <span className="text-xs font-extrabold uppercase tracking-[0.04em] text-[var(--ink-faint)]">{label}</span>
                                <div className="h-[42px] rounded-xl border border-[var(--border-soft)] bg-[var(--surface-sunken)]" />
                            </div>
                        ))}
                    </div>

                    <div className={`${card} overflow-hidden`}>
                        <div className="flex items-center gap-[22px] border-b border-[var(--border-soft)] px-[22px] py-4">
                            <div className="flex-1 text-[15.5px] font-extrabold text-foreground">{t('reports.setup.sampleTitle')}</div>
                            <div>
                                <div className="text-xs font-bold text-[var(--ink-faint)]">{t('reports.table.income')}</div>
                                <div className="text-base font-extrabold tabular-nums text-[var(--positive)]">{fmt(totalIncome)}</div>
                            </div>
                            <div>
                                <div className="text-xs font-bold text-[var(--ink-faint)]">{t('reports.table.expense')}</div>
                                <div className="text-base font-extrabold tabular-nums text-foreground">{fmt(totalExpense)}</div>
                            </div>
                        </div>
                        {SAMPLE_ROWS.map((row) => (
                            <div key={row.key} className="flex items-center border-t border-[var(--border-soft)] first:border-t-0">
                                <div className="w-[34%] px-4 py-[13px] text-sm font-bold text-foreground">{t(`reports.setup.spheres.${row.key}`)}</div>
                                <div className="flex flex-1 flex-col gap-1 px-2.5 py-[13px]">
                                    <div className="h-[7px] rounded-full bg-[var(--positive)]" style={{ width: `${(row.income / max) * 100}%` }} />
                                    <div className="h-[7px] rounded-full bg-[var(--primary)]" style={{ width: `${(row.expense / max) * 100}%` }} />
                                </div>
                                <div className="w-[20%] px-4 py-[13px] text-right text-sm font-extrabold tabular-nums text-foreground">
                                    {fmt(row.income - row.expense)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Deliberately no button look: it labels the preview, it is not an action. */}
                <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-center">
                    <span className="-mt-[11px] inline-flex items-center gap-1.5 rounded-[var(--r-sm)] border border-[var(--border-soft)] bg-[var(--surface-track)] px-2.5 py-1 text-[11.5px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
                        <Eye size={13} />
                        {t('reports.setup.previewLabel')}
                    </span>
                </div>
            </div>
        </div>
    );
}
