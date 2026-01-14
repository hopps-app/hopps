import { useTranslation } from 'react-i18next';

import { OrganizationTreeNodeModel } from '@/components/OrganizationStructureTree/OrganizationTreeNodeModel';
import Button from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Emoji from '@/components/ui/Emoji';

interface BommelDetailsPanelProps {
    selectedBommel: OrganizationTreeNodeModel | null;
    subBommelsCount: number;
    onNavigateToReceipts: () => void;
}

export function BommelDetailsPanel({ selectedBommel, subBommelsCount, onNavigateToReceipts }: BommelDetailsPanelProps) {
    const { t } = useTranslation();

    if (!selectedBommel) {
        return (
            <Card className="sticky top-6 bg-white">
                <CardContent className="py-12 text-center text-gray-500">{t('organization.structure.details.selectBommel')}</CardContent>
            </Card>
        );
    }

    const income = selectedBommel.data?.income || 0;
    const expenses = selectedBommel.data?.expenses || 0;
    const revenue = selectedBommel.data?.revenue || 0;
    const receiptsCount = selectedBommel.data?.receiptsCount || 0;
    const receiptsOpen = selectedBommel.data?.receiptsOpen || 0;

    return (
        <Card className="sticky top-6 bg-white">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    {selectedBommel.data?.emoji && <Emoji emoji={selectedBommel.data.emoji} className="text-2xl" />}
                    {selectedBommel.text}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                    <p className="text-sm text-gray-600">{t('organization.structure.details.income')}</p>
                    <p className="text-lg text-green-600">+{income.toLocaleString('de-DE')}€</p>
                </div>

                <div>
                    <p className="text-sm text-gray-600">{t('organization.structure.details.expenses')}</p>
                    <p className="text-lg text-red-600">{expenses.toLocaleString('de-DE')}€</p>
                </div>

                <div className="border-t pt-4">
                    <p className="text-sm text-gray-600">{t('organization.structure.details.revenue')}</p>
                    <p className={`text-xl ${revenue >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {revenue >= 0 ? '+' : ''}
                        {revenue.toLocaleString('de-DE')}€
                    </p>
                </div>

                <div className="space-y-2 border-t pt-4">
                    <div className="flex justify-between">
                        <span className="text-sm text-gray-600">{t('organization.structure.details.receipts')}</span>
                        <span className="text-sm text-gray-900">{receiptsCount}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-sm text-gray-600">{t('organization.structure.details.openInvoices')}</span>
                        <span className="text-sm text-gray-900">{receiptsOpen}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-sm text-gray-600">{t('organization.structure.details.subBommels')}</span>
                        <span className="text-sm text-gray-900">{subBommelsCount}</span>
                    </div>
                </div>

                <Button onClick={onNavigateToReceipts} className="w-full" variant="default">
                    {t('organization.structure.details.toReceipts')}
                </Button>
            </CardContent>
        </Card>
    );
}

export default BommelDetailsPanel;
