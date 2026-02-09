import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import apiService from '@/services/ApiService';
import { useStore } from '@/store/store';

function DashboardView() {
    const { t } = useTranslation();
    const { organization } = useStore();

    // Get current year date range
    const currentYear = new Date().getFullYear();
    const startDate = `${currentYear}-01-01`;
    const endDate = `${currentYear}-12-31`;

    // Fetch all transactions for the current year
    const { data: transactions, isLoading, error } = useQuery({
        queryKey: ['transactions', organization?.id, startDate, endDate],
        queryFn: () =>
            apiService.orgService.transactionsAll(
                undefined, // bommelId - undefined to get all
                undefined, // categoryId
                undefined, // detached
                endDate,   // endDate
                undefined, // page
                undefined, // privatelyPaid
                undefined, // search
                10000,     // size - large enough to get all transactions
                startDate, // startDate
                undefined  // status
            ),
        enabled: !!organization?.id,
    });

    // Aggregate transactions by month
    const chartData = useMemo(() => {
        if (!transactions || transactions.length === 0) {
            return [];
        }

        const monthlyData: Record<string, { income: number; expenses: number }> = {};

        // Initialize all months
        const months = [
            'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
        ];
        months.forEach(month => {
            monthlyData[month] = { income: 0, expenses: 0 };
        });

        // Aggregate transactions by month
        transactions.forEach(transaction => {
            if (!transaction.transactionTime) return;

            const date = new Date(transaction.transactionTime);
            const monthIndex = date.getMonth();
            const monthKey = months[monthIndex];
            const total = transaction.total || 0;

            if (total > 0) {
                monthlyData[monthKey].income += total;
            } else {
                monthlyData[monthKey].expenses += Math.abs(total);
            }
        });

        // Convert to array for Recharts
        return months.map(month => ({
            month,
            income: monthlyData[month].income,
            expenses: monthlyData[month].expenses,
        }));
    }, [transactions]);

    // Check if there's any data to display
    const hasData = chartData.some(d => d.income > 0 || d.expenses > 0);

    return (
        <div className="px-7 py-[2.5rem]">
            <h1 className="text-3xl font-bold mb-6">{t('dashboard.title')}</h1>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">
                    {t('dashboard.incomeExpenseChart')}
                </h2>

                {isLoading && (
                    <div className="flex items-center justify-center h-96">
                        <p className="text-gray-500">{t('common.loading')}</p>
                    </div>
                )}

                {error && (
                    <div className="flex items-center justify-center h-96">
                        <p className="text-red-500">
                            {t('dashboard.loadError')}
                        </p>
                    </div>
                )}

                {!isLoading && !error && !hasData && (
                    <div className="flex flex-col items-center justify-center h-96 text-gray-500">
                        <p className="text-lg font-medium mb-2">
                            {t('dashboard.noData')}
                        </p>
                        <p className="text-sm">
                            {t('dashboard.noDataHint', { year: currentYear })}
                        </p>
                    </div>
                )}

                {!isLoading && !error && hasData && (
                    <>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                            {t('dashboard.timeRange', { startDate, endDate })}
                        </p>
                        <ResponsiveContainer width="100%" height={400}>
                            <LineChart
                                data={chartData}
                                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" />
                                <YAxis />
                                <Tooltip
                                    formatter={(value: number) => `€${value.toFixed(2)}`}
                                    contentStyle={{
                                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                        border: '1px solid #ccc',
                                        borderRadius: '4px',
                                    }}
                                />
                                <Legend />
                                <Line
                                    type="monotone"
                                    dataKey="income"
                                    stroke="#10b981"
                                    strokeWidth={2}
                                    name={t('dashboard.income')}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="expenses"
                                    stroke="#ef4444"
                                    strokeWidth={2}
                                    name={t('dashboard.expenses')}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </>
                )}
            </div>
        </div>
    );
}

export default DashboardView;
