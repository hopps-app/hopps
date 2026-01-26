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

    const total = selectedBommel.data?.total || 0;
    const income = selectedBommel.data?.income || 0;
    const expenses = selectedBommel.data?.expenses || 0;
    const transactionsCount = selectedBommel.data?.transactionsCount || 0;

    return (
        <Card className="sticky top-6 bg-white">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    {selectedBommel.data?.emoji && <Emoji emoji={selectedBommel.data.emoji} className="text-2xl" />}
                    {selectedBommel.text}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 border-b pb-4">
                    <div>
                        <p className="text-sm text-gray-600">{t('organization.structure.details.income')}</p>
                        <p className="text-xl text-green-600">+{income.toLocaleString('de-DE')}€</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600">{t('organization.structure.details.expenses')}</p>
                        <p className="text-xl text-red-600">-{expenses.toLocaleString('de-DE')}€</p>
                    </div>
                </div>

                <div className="border-b pb-4">
                    <p className="text-sm text-gray-600">{t('organization.structure.details.total')}</p>
                    <p className={`text-xl ${total >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {total >= 0 ? '+' : ''}
                        {total.toLocaleString('de-DE')}€
                    </p>
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between">
                        <span className="text-sm text-gray-600">{t('organization.structure.details.transactions')}</span>
                        <span className="text-sm text-gray-900">{transactionsCount}</span>
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
