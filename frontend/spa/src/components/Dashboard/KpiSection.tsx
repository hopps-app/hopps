import { TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Change, formatCurrency, percentageChange } from './format';
import { useBankBalance, useYearTotals } from './hooks';
import { KpiCard } from './KpiCard';

/**
 * The three headline figures. They always cover the running year for the whole organization — the
 * chart's filters do not touch them, so they stay a stable reference point.
 */
export function KpiSection({ organizationId }: { organizationId: number | undefined }) {
    const { t, i18n } = useTranslation();
    const year = new Date().getFullYear();

    const balance = useBankBalance(organizationId);
    const totals = useYearTotals(organizationId);

    const describe = (change: Change | null, hasBookings: boolean) => {
        if (!hasBookings) {
            return t('dashboard.kpi.noTransactions');
        }
        if (!change) {
            return t('dashboard.kpi.noComparison');
        }
        if (change.direction === 'flat') {
            return t('dashboard.kpi.changeFlat');
        }
        return t(change.direction === 'up' ? 'dashboard.kpi.changeUp' : 'dashboard.kpi.changeDown', { percent: change.percent });
    };

    const hasBookings = (totals.data?.transactionCount ?? 0) > 0;
    const incomeChange = totals.data ? percentageChange(totals.data.income, totals.data.previousIncome) : null;
    const expensesChange = totals.data ? percentageChange(totals.data.expenses, totals.data.previousExpenses) : null;

    return (
        <div className="mb-4 flex min-w-0 flex-col gap-4 sm:mb-[18px] sm:flex-row" data-testid="dashboard-kpis">
            <KpiCard
                label={t('dashboard.kpi.balance')}
                value={formatCurrency(i18n.language, balance.data?.balance)}
                context={balance.data?.accountCount ? t('dashboard.kpi.available') : t('dashboard.kpi.noAccount')}
                icon={Wallet}
                isLoading={balance.isPending}
                error={balance.error}
                onRetry={() => balance.refetch()}
                data-testid="dashboard-kpi-balance"
            />
            <KpiCard
                label={t('dashboard.kpi.income', { year })}
                value={formatCurrency(i18n.language, totals.data?.income)}
                context={describe(incomeChange, hasBookings)}
                // Rising income is good news; falling income is merely neutral — the dashboard reports,
                // it does not pass judgement.
                tone={incomeChange?.direction === 'up' ? 'positive' : 'neutral'}
                icon={TrendingUp}
                isLoading={totals.isPending}
                error={totals.error}
                onRetry={() => totals.refetch()}
                data-testid="dashboard-kpi-income"
            />
            <KpiCard
                label={t('dashboard.kpi.expenses', { year })}
                value={formatCurrency(i18n.language, totals.data?.expenses)}
                context={describe(expensesChange, hasBookings)}
                tone={expensesChange?.direction === 'down' ? 'positive' : 'neutral'}
                icon={TrendingDown}
                isLoading={totals.isPending}
                error={totals.error}
                onRetry={() => totals.refetch()}
                data-testid="dashboard-kpi-expenses"
            />
        </div>
    );
}
