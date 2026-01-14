import { useTranslation } from 'react-i18next';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

interface OrganizationStatsProps {
    totalBommels: number;
    totalIncome: number;
    totalExpenses: number;
    totalReceipts: number;
}

export function OrganizationStats({ totalBommels, totalIncome, totalExpenses, totalReceipts }: OrganizationStatsProps) {
    const { t } = useTranslation();

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                    <CardTitle className="text-sm text-gray-600">{t('organization.stats.totalIncome')}</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-2xl text-green-600">{totalIncome.toLocaleString('de-DE')}€</p>
                </CardContent>
            </Card>

            <Card className="bg-white">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-gray-600">{t('organization.stats.totalExpenses')}</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-2xl text-red-600">{totalExpenses.toLocaleString('de-DE')}€</p>
                </CardContent>
            </Card>

            <Card className="bg-white">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-gray-600">{t('organization.stats.totalReceipts')}</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-2xl text-gray-900">{totalReceipts}</p>
                </CardContent>
            </Card>
        </div>
    );
}

export default OrganizationStats;
