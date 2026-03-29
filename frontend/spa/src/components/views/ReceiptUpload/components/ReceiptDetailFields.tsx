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
        <div className="flex flex-col gap-3 2xl:gap-2">
            {/* Belegnummer row with paid badge */}
            <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                    <Label className="text-muted-foreground text-xs">{t('receipts.upload.receiptNumber')}</Label>
                    <p className="text-lg font-semibold mt-1 min-h-[1.25rem]">{receiptNumber || '—'}</p>
                </div>
                <span
                    className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold whitespace-nowrap shrink-0 shadow-sm ${
                        isUnpaid ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}
                >
                    {isUnpaid ? t('receipts.paidLabel.unpaid') : t('receipts.paidLabel.paid')}
                </span>
            </div>

            <hr className="border-gray-200 -my-1" />

            {/* Main fields grid */}
            <div className="grid grid-cols-1 gap-x-4 gap-y-4 2xl:gap-x-8 2xl:gap-y-6 sm:grid-cols-2 pb-3 2xl:pb-4">
                <DetailField label={t('receipts.upload.receiptDate')} value={formatDate(receiptDate)} />
                <DetailField
                    label={t('receipts.upload.transactionKind')}
                    value={transactionKind === 'intake' ? t('receipts.types.income') : transactionKind === 'expense' ? t('receipts.types.expense') : ''}
                />

                <DetailField label={t('receipts.upload.contractPartner')} value={contractPartner} fullWidth />

                <DetailField label={t('receipts.upload.bommel')} value={bommelName} />
                <DetailField label={t('receipts.upload.area')} value={areaLabels[area] ?? area} />

                <DetailField label={t('receipts.upload.dueDate')} value={formatDate(dueDate)} />
                <DetailField label={t('receipts.upload.category')} value={categoryName} />
            </div>

            {/* Tags as inline pills (no label) */}
            {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {tags.map((tag, idx) => (
                        <span key={`${tag}-${idx}`} className="px-4 py-1.5 rounded-[15px] bg-purple-100 text-xs font-medium shadow-sm">
                            {tag}
                        </span>
                    ))}
                </div>
            )}

            {/* Amounts section */}
            <div className="border-t border-gray-200 pt-4 2xl:pt-6">
                <div className="grid grid-cols-1 gap-x-4 gap-y-4 2xl:gap-x-8 2xl:gap-y-6 sm:grid-cols-2">
                    <div>
                        <Label className="text-muted-foreground text-xs">{t('receipts.upload.taxAmount')}</Label>
                        <p className="text-base font-semibold mt-1">{formatCurrency(taxAmount) || '—'}</p>
                    </div>
                    <div>
                        <Label className="text-muted-foreground text-xs">{t('receipts.upload.grossAmount')}</Label>
                        <p className="text-xl font-bold mt-1">{formatCurrency(grossAmount) || '—'}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ReceiptDetailFields;
