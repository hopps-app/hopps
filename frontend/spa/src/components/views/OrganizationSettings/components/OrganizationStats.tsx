import { useTranslation } from 'react-i18next';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

interface OrganizationStatsProps {
    totalBommels: number;
    total: number;
    income: number;
    expenses: number;
    totalTransactions: number;
}

export function OrganizationStats({ totalBommels, total, income, expenses, totalTransactions }: OrganizationStatsProps) {
    const { t } = useTranslation();

    return (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card className="bg-white">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-gray-600">{t('organization.stats.totalBommels')}</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-2xl text-gray-900">{totalBommels}</p>
                </CardContent>
            </Card>

            <Card className="bg-white">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-gray-600">{t('organization.stats.income')}</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-2xl text-green-600">+{income.toLocaleString('de-DE')}€</p>
                </CardContent>
            </Card>

            <Card className="bg-white">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-gray-600">{t('organization.stats.expenses')}</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-2xl text-red-600">-{expenses.toLocaleString('de-DE')}€</p>
                </CardContent>
            </Card>

            <Card className="bg-white">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-gray-600">{t('organization.stats.total')}</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className={`text-2xl ${total >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {total >= 0 ? '+' : ''}
                        {total.toLocaleString('de-DE')}€
                    </p>
                </CardContent>
            </Card>

            <Card className="bg-white">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-gray-600">{t('organization.stats.totalTransactions')}</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-2xl text-gray-900">{totalTransactions}</p>
                </CardContent>
            </Card>
        </div>
    );
}

export default OrganizationStats;
