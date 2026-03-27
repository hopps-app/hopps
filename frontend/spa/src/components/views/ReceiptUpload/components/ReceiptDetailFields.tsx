import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { Label } from '@/components/ui/Label';
import { useCategories } from '@/hooks/queries';
import { useBommelsStore } from '@/store/bommels/bommelsStore';

interface ReceiptDetailFieldsProps {
    receiptNumber: string;
    receiptDate: Date | undefined;
    dueDate: Date | undefined;
    transactionKind: 'intake' | 'expense' | '';
    isUnpaid: boolean;
    contractPartner: string;
    bommelId: number | null;
    category: string;
    area: string;
    tags: string[];
    grossAmount: string;
    taxAmount: string;
}

function DetailField({ label, value, fullWidth }: { label: string; value: React.ReactNode; fullWidth?: boolean }) {
    return (
        <div className={fullWidth ? 'sm:col-span-2' : ''}>
            <Label className="text-muted-foreground text-xs">{label}</Label>
            <p className="text-sm font-medium mt-1 min-h-[1.25rem]">{value || '—'}</p>
        </div>
    );
}

export function ReceiptDetailFields({
    receiptNumber,
    receiptDate,
    dueDate,
    transactionKind,
    isUnpaid,
    contractPartner,
    bommelId,
    category,
    area,
    tags,
    grossAmount,
    taxAmount,
}: ReceiptDetailFieldsProps) {
    const { t } = useTranslation();
    const { data: categories = [] } = useCategories();
    const allBommels = useBommelsStore((s) => s.allBommels);

    const areaLabels: Record<string, string> = {
        IDEELL: t('receipts.areas.ideell'),
        ZWECKBETRIEB: t('receipts.areas.zweckbetrieb'),
        VERMOEGENSVERWALTUNG: t('receipts.areas.vermoegensverwaltung'),
        WIRTSCHAFTLICH: t('receipts.areas.wirtschaftlich'),
        UNKNOWN: t('receipts.areas.unknown'),
    };

    const bommelName = useMemo(() => {
        if (!bommelId) return '';
        const bommel = allBommels.find((b) => b.id === bommelId);
        return bommel?.name ?? '';
    }, [bommelId, allBommels]);

    const categoryName = useMemo(() => {
        if (!category) return '';
        const cat = categories.find((c) => String(c.id) === category);
        return cat?.name ?? '';
    }, [category, categories]);

    const formatDate = (date: Date | undefined) => {
        if (!date) return '';
        return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const formatCurrency = (value: string) => {
        if (!value) return '';
        return `${value} €`;
    };

    return (
        <div className="grid grid-cols-1 gap-x-4 gap-y-4 2xl:gap-x-8 2xl:gap-y-6 sm:grid-cols-2">
            <DetailField label={t('receipts.upload.receiptNumber')} value={receiptNumber} />
            <DetailField label={t('receipts.upload.receiptDate')} value={formatDate(receiptDate)} />

            <DetailField
                label={t('receipts.upload.transactionKind')}
                value={transactionKind === 'intake' ? t('receipts.types.income') : transactionKind === 'expense' ? t('receipts.types.expense') : ''}
            />
            <DetailField label={t('receipts.upload.paymentStatus')} value={isUnpaid ? t('receipts.upload.unpaid') : t('receipts.upload.paid')} />

            <DetailField label={t('receipts.upload.contractPartner')} value={contractPartner} fullWidth />

            <DetailField label={t('receipts.upload.bommel')} value={bommelName} />
            <DetailField label={t('receipts.upload.area')} value={areaLabels[area] ?? area} />

            <DetailField label={t('receipts.upload.dueDate')} value={formatDate(dueDate)} />
            <DetailField label={t('receipts.upload.category')} value={categoryName} />

            {tags.length > 0 && (
                <div className="sm:col-span-2">
                    <Label className="text-muted-foreground text-xs">{t('receipts.upload.tags')}</Label>
                    <div className="flex flex-wrap gap-2 mt-1">
                        {tags.map((tag, idx) => (
                            <span key={`${tag}-${idx}`} className="px-4 py-1.5 rounded-[15px] bg-purple-100 text-xs font-medium">
                                {tag}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            <DetailField label={t('receipts.upload.taxAmount')} value={formatCurrency(taxAmount)} />
            <DetailField label={t('receipts.upload.grossAmount')} value={formatCurrency(grossAmount)} />
        </div>
    );
}

export default ReceiptDetailFields;
