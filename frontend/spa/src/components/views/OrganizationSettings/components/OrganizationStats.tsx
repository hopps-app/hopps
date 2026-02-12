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
            <Card className="bg-white min-w-0">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-gray-600">{t('organization.stats.totalBommels')}</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-lg lg:text-2xl text-gray-900 truncate">{totalBommels}</p>
                </CardContent>
            </Card>

            <Card className="bg-white min-w-0">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-gray-600">{t('organization.stats.income')}</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-lg lg:text-2xl text-green-600 truncate" title={`+${income.toLocaleString('de-DE')}€`}>+{income.toLocaleString('de-DE')}€</p>
                </CardContent>
            </Card>

            <Card className="bg-white min-w-0">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-gray-600">{t('organization.stats.expenses')}</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-lg lg:text-2xl text-red-600 truncate" title={`-${expenses.toLocaleString('de-DE')}€`}>-{expenses.toLocaleString('de-DE')}€</p>
                </CardContent>
            </Card>

            <Card className="bg-white min-w-0">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-gray-600">{t('organization.stats.total')}</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className={`text-lg lg:text-2xl truncate ${total >= 0 ? 'text-green-600' : 'text-red-600'}`}
                       title={`${total >= 0 ? '+' : ''}${total.toLocaleString('de-DE')}€`}>
                        {total >= 0 ? '+' : ''}
                        {total.toLocaleString('de-DE')}€
                    </p>
                </CardContent>
            </Card>

            <Card className="bg-white min-w-0">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-gray-600">{t('organization.stats.totalTransactions')}</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-lg lg:text-2xl text-gray-900 truncate">{totalTransactions}</p>
                </CardContent>
            </Card>
        </div>
    );
}

export default OrganizationStats;
