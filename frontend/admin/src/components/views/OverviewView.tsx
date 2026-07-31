import { Building2, CheckCircle2, FileText, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import ActivityTrendChart from '@/features/dashboard/ActivityTrendChart';
import { fetchDashboard } from '@/features/dashboard/api';
import { aiCounts, aiSharePercent, belegeTotals, cumulativeTotals, latest, monthOverMonth, previous } from '@/features/dashboard/derive';
import ExtractionTrendChart from '@/features/dashboard/ExtractionTrendChart';
import { CARD_HEIGHT, PLOT_HEIGHT } from '@/features/dashboard/line';
// Hidden for now — restore alongside the <SignupsChart /> usage below:
// import SignupsChart from '@/features/dashboard/SignupsChart';
import StatCard from '@/features/dashboard/StatCard';
import type { DashboardOverview } from '@/features/dashboard/types';
import { formatDeltaPct, formatNumber } from '@/features/organizations/format';

/**
 * The admin Übersicht: a row of Kennzahlen over three charts.
 *
 * The cards answer "what should I know right now"; the charts underneath show how each of those
 * numbers got there. Every figure is estate-wide and comes from a single `GET /admin/dashboard` —
 * the cards are derived from the same series the charts draw rather than sent separately.
 */
export default function OverviewView() {
    const { t } = useTranslation();
    const [data, setData] = useState<DashboardOverview | null>(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        let cancelled = false;
        fetchDashboard()
            .then((d) => !cancelled && setData(d))
            .catch((e) => {
                console.error('Failed to load the dashboard:', e);
                if (!cancelled) setFailed(true);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    return (
        <div className="fade-up pb-6">
            <div className="mb-[18px]">
                <h1 className="text-[27px] font-extrabold text-ink">{t('dashboard.title')}</h1>
                <p className="text-[14.5px] text-ink-2 mt-[5px]">{t('dashboard.subtitle')}</p>
            </div>

            {failed ? (
                <div className="card card--flat p-10 text-center">
                    <p className="text-[13.5px] text-neg-ink">{t('dashboard.loadError')}</p>
                </div>
            ) : data === null ? (
                <Skeleton />
            ) : (
                <Overview data={data} t={t} />
            )}
        </div>
    );
}

function Overview({ data, t }: { data: DashboardOverview; t: (key: string, options?: Record<string, unknown>) => string }) {
    const totals = cumulativeTotals(data.totalOrganizations, data.signupsPerMonth);
    const signupsThisMonth = latest(data.signupsPerMonth.map((m) => m.value));

    const activeShare = data.totalOrganizations > 0 ? Math.round((data.activeOrganizationsInWindow / data.totalOrganizations) * 100) : 0;

    const belege = belegeTotals(data.extractionPerMonth);
    const belegeDelta = monthOverMonth(belege);

    const aiShare = aiSharePercent(data.extractionPerMonth);
    const ai = aiCounts(data.extractionPerMonth);
    // Percentage points, not a percentage change: a share moving 30 % → 26 % fell by 4 pp, and calling
    // that "−13 %" would be true but unreadable next to a figure printed as "26 %".
    const aiDeltaPp = Math.round(latest(aiShare) - previous(aiShare));

    return (
        <div className="flex flex-col gap-5">
            <div className={`grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 ${CARD_HEIGHT}`}>
                <StatCard
                    label={t('dashboard.cards.totalOrganizations')}
                    icon={Building2}
                    value={formatNumber(data.totalOrganizations)}
                    change={signupsThisMonth > 0 ? `+${formatNumber(signupsThisMonth)}` : undefined}
                    changeTone="positive"
                    footer={t('dashboard.cards.sinceLastMonth')}
                    series={totals}
                />
                <StatCard
                    label={t('dashboard.cards.activeOrganizations')}
                    icon={CheckCircle2}
                    value={formatNumber(data.activeOrganizationsInWindow)}
                    change={`${activeShare} %`}
                    footer={t('dashboard.cards.lastDays', { count: data.activeOrganizationsPerDay.length })}
                    series={data.activeOrganizationsPerDay}
                />
                <StatCard
                    label={t('dashboard.cards.belegeThisMonth')}
                    icon={FileText}
                    value={formatNumber(latest(belege))}
                    change={belegeDelta !== null ? formatDeltaPct(belegeDelta) : undefined}
                    changeTone={belegeDelta !== null && belegeDelta < 0 ? 'negative' : 'positive'}
                    footer={t('dashboard.cards.vsPreviousMonth')}
                    series={belege}
                />
                <StatCard
                    label={t('dashboard.cards.aiShare')}
                    icon={Sparkles}
                    value={`${Math.round(latest(aiShare))} %`}
                    change={aiDeltaPp !== 0 ? t('dashboard.cards.pp', { value: aiDeltaPp > 0 ? `+${aiDeltaPp}` : aiDeltaPp }) : undefined}
                    changeTone={aiDeltaPp < 0 ? 'negative' : 'positive'}
                    footer={t('dashboard.cards.ofBelege', { ai: formatNumber(latest(ai)), total: formatNumber(latest(belege)) })}
                    series={aiShare}
                    // Carries the colour AI has in the Erfassungswege chart below, so the two connect.
                    color="var(--warn)"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Hidden for now — the Vereine-gesamt card above already carries the count and its
                    monthly change. Restore alongside the commented import to bring the growth line back:
                    <SignupsChart total={data.totalOrganizations} months={data.signupsPerMonth} /> */}
                <ActivityTrendChart days={data.activityPerDay} />
                <ExtractionTrendChart months={data.extractionPerMonth} />
            </div>
        </div>
    );
}

function Skeleton() {
    return (
        <div className="flex flex-col gap-5">
            <div className={`grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 ${CARD_HEIGHT}`}>
                {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="card px-[18px] py-4 h-full">
                        <div className="skel h-4 w-24 mb-3" />
                        <div className="skel h-8 w-16" />
                    </div>
                ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {[0, 1].map((i) => (
                    <div key={i} className="card px-[18px] py-4">
                        <div className="skel h-4 w-24 mb-3" />
                        {/* Same height as the real plots, so the page does not jump when data lands. */}
                        <div className={`skel ${PLOT_HEIGHT} w-full`} />
                    </div>
                ))}
            </div>
        </div>
    );
}
