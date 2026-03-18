import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { FormErrors, LoadingStates } from '../hooks/useReceiptForm';

import InvoiceUploadFormBommelSelector from '@/components/InvoiceUploadForm/InvoiceUploadFormBommelSelector';
import { Label } from '@/components/ui/Label';
import Radio from '@/components/ui/Radio';
import SearchSelect, { SearchSelectItem } from '@/components/ui/SearchSelect';
import Select, { SelectItem } from '@/components/ui/Select';
import { DatePicker } from '@/components/ui/shadecn/DatePicker';
import Switch from '@/components/ui/Switch';
import Tags from '@/components/ui/Tags';
import TextField from '@/components/ui/TextField';
import { useCategories } from '@/hooks/queries';

interface ReceiptFormFieldsProps {
    receiptNumber: string;
    onReceiptNumberChange: (value: string) => void;
    receiptDate: Date | undefined;
    onReceiptDateChange: (date: Date | undefined) => void;
    dueDate: Date | undefined;
    onDueDateChange: (date: Date | undefined) => void;
    transactionKind: 'intake' | 'expense' | '';
    onTransactionKindChange: (value: 'intake' | 'expense' | '') => void;
    isUnpaid: boolean;
    onIsUnpaidChange: (value: boolean) => void;
    contractPartner: string;
    onContractPartnerChange: (value: string) => void;
    bommelId: number | null;
    onBommelIdChange: (id: number | null) => void;
    category: string;
    onCategoryChange: (value: string) => void;
    area: string;
    onAreaChange: (value: string) => void;
    tags: string[];
    onTagsChange: (tags: string[]) => void;
    grossAmount: string;
    onGrossAmountChange: (value: string) => void;
    taxAmount: string;
    onTaxAmountChange: (value: string) => void;
    loadingStates: LoadingStates;
    errors?: FormErrors;
    readOnly?: boolean;
}

export function ReceiptFormFields({
    receiptNumber,
    onReceiptNumberChange,
    receiptDate,
    onReceiptDateChange,
    dueDate,
    onDueDateChange,
    transactionKind,
    onTransactionKindChange,
    isUnpaid,
    onIsUnpaidChange,
    contractPartner,
    onContractPartnerChange,
    bommelId,
    onBommelIdChange,
    category,
    onCategoryChange,
    area,
    onAreaChange,
    tags,
    onTagsChange,
    grossAmount,
    onGrossAmountChange,
    taxAmount,
    onTaxAmountChange,
    loadingStates,
    errors = {},
    readOnly = false,
}: ReceiptFormFieldsProps) {
    const { t } = useTranslation();
    const { data: categories = [], isLoading: categoriesLoading } = useCategories();

    const areaItems: SelectItem[] = [
        { value: 'IDEELL', label: t('receipts.areas.ideell') },
        { value: 'ZWECKBETRIEB', label: t('receipts.areas.zweckbetrieb') },
        { value: 'VERMOEGENSVERWALTUNG', label: t('receipts.areas.vermoegensverwaltung') },
        { value: 'WIRTSCHAFTLICH', label: t('receipts.areas.wirtschaftlich') },
        { value: 'UNKNOWN', label: t('receipts.areas.unknown') },
    ];

    const categoryItems: SearchSelectItem[] = useMemo(
        () =>
            categories.map((cat) => ({
                value: String(cat.id),
                label: cat.name ?? '',
            })),
        [categories]
    );

    const radioItems = [
        { value: 'intake', label: t('receipts.types.income') },
        { value: 'expense', label: t('receipts.types.expense') },
    ];

    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Row 1: Receipt number + Date */}
            <TextField
                label={t('receipts.upload.receiptNumber')}
                value={receiptNumber}
                onValueChange={onReceiptNumberChange}
                loading={loadingStates.receiptNumber}
                error={errors.receiptNumber}
                required
                disabled={readOnly}
            />
            <DatePicker
                label={t('receipts.upload.receiptDate')}
                date={receiptDate}
                onSelect={onReceiptDateChange}
                className="w-full"
                loading={loadingStates.receiptDate}
                error={errors.receiptDate}
                required
                disabled={readOnly}
            />

            {/* Row 2: Transaction type + Unpaid toggle */}
            <div className="relative">
                <Radio
                    items={radioItems}
                    value={transactionKind}
                    onValueChange={(v) => onTransactionKindChange(v as 'intake' | 'expense')}
                    layout="horizontal"
                    label={t('receipts.upload.transactionKind')}
                    disabled={readOnly}
                />
                {errors.transactionKind && (
                    <p className="text-xs text-red-500 mt-1 animate-in fade-in slide-in-from-top-1 duration-200" role="alert">
                        {errors.transactionKind}
                    </p>
                )}
            </div>
            <div className="flex items-center">
                <Switch
                    checked={isUnpaid}
                    onCheckedChange={onIsUnpaidChange}
                    label={isUnpaid ? t('receipts.upload.paid') : t('receipts.upload.unpaid')}
                    disabled={readOnly}
                />
            </div>

            {/* Row 3: Contract partner + Bommel */}
            <TextField
                label={t('receipts.upload.contractPartner')}
                value={contractPartner}
                onValueChange={onContractPartnerChange}
                loading={loadingStates.contractPartner}
                error={errors.contractPartner}
                required
                disabled={readOnly}
            />
            <div className="grid w-full items-center gap-1.5">
                <Label className={errors.bommelId ? 'text-red-500' : ''} required>
                    {t('receipts.upload.bommel')}
                </Label>
                <InvoiceUploadFormBommelSelector
                    value={bommelId}
                    onChange={(id) => onBommelIdChange((id as number) ?? null)}
                    disabled={readOnly}
                    error={!!errors.bommelId}
                />
                {errors.bommelId && (
                    <p className="text-xs text-red-500 animate-in fade-in slide-in-from-top-1 duration-200" role="alert">
                        {errors.bommelId}
                    </p>
                )}
            </div>

            {/* Row 4: Area + Category */}
            <Select
                label={t('receipts.upload.area')}
                value={area}
                onValueChanged={onAreaChange}
                items={areaItems}
                error={errors.area}
                required
                disabled={readOnly}
            />
            <SearchSelect
                label={t('receipts.upload.category')}
                value={category}
                onValueChange={onCategoryChange}
                items={categoryItems}
                placeholder={categoriesLoading ? t('common.loading') : t('receipts.upload.selectCategory')}
                disabled={readOnly}
            />

            {/* Row 5: Due date (optional) */}
            <DatePicker
                label={t('receipts.upload.dueDate')}
                date={dueDate}
                onSelect={onDueDateChange}
                className="w-full"
                loading={loadingStates.dueDate}
                disabled={readOnly}
            />

            {/* Row 6: Tags (full width) */}
            <div className="sm:col-span-2">
                <Tags
                    label={t('receipts.upload.tags')}
                    value={tags}
                    onChange={onTagsChange}
                    placeholder={t('receipts.upload.addTag')}
                    loading={loadingStates.tags}
                    disabled={readOnly}
                />
            </div>

            {/* Row 7: Tax amount + Gross amount */}
            <TextField
                label={t('receipts.upload.taxAmount')}
                value={taxAmount}
                onValueChange={(v) => {
                    if (v === '' || /^-?[0-9]*[.,]?[0-9]*$/.test(v)) {
                        onTaxAmountChange(v);
                    }
                }}
                loading={loadingStates.taxAmount}
                error={errors.taxAmount}
                className="pr-8"
                disabled={readOnly}
                suffix="€"
            />
            <TextField
                label={t('receipts.upload.grossAmount')}
                value={grossAmount}
                onValueChange={(v) => {
                    if (v === '' || /^-?[0-9]*[.,]?[0-9]*$/.test(v)) {
                        onGrossAmountChange(v);
                    }
                }}
                loading={loadingStates.grossAmount}
                error={errors.grossAmount}
                required
                disabled={readOnly}
                className="pr-8"
                suffix="€"
            />
        </div>
    );
}

export default ReceiptFormFields;
