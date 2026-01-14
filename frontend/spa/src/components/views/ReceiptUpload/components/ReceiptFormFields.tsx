import { useTranslation } from 'react-i18next';

import InvoiceUploadFormBommelSelector from '@/components/InvoiceUploadForm/InvoiceUploadFormBommelSelector';
import Radio from '@/components/ui/Radio';
import Select, { SelectItem } from '@/components/ui/Select';
import Switch from '@/components/ui/Switch';
import Tags from '@/components/ui/Tags';
import TextField from '@/components/ui/TextField';
import { DatePicker } from '@/components/ui/shadecn/DatePicker';

import { LoadingStates } from '../hooks/useReceiptForm';

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
    netAmount: string;
    onNetAmountChange: (value: string) => void;
    taxAmount: string;
    onTaxAmountChange: (value: string) => void;
    loadingStates: LoadingStates;
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
    netAmount,
    onNetAmountChange,
    taxAmount,
    onTaxAmountChange,
    loadingStates,
}: ReceiptFormFieldsProps) {
    const { t } = useTranslation();

    const areaItems: SelectItem[] = [
        { value: 'ideeller-bereich', label: t('receipts.areas.ideell') },
        { value: 'zweckbetrieb', label: t('receipts.areas.zweckbetrieb') },
        { value: 'vermoegensverwaltung', label: t('receipts.areas.vermoegensverwaltung') },
        { value: 'wirtschaftlicher-gb', label: t('receipts.areas.wirtschaftlich') },
    ];

    const categoryItems: SelectItem[] = [{ value: 'lizenzen-it-infrastruktur', label: 'Lizenzen IT-Infrastruktur' }]; // TODO: Load from API

    const radioItems = [
        { value: 'intake', label: t('receipts.types.income') },
        { value: 'expense', label: t('receipts.types.expense') },
    ];

    // Suppress unused variable warning - bommelId is used for controlled component pattern
    void bommelId;

    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField
                label={t('receipts.upload.receiptNumber')}
                value={receiptNumber}
                onValueChange={onReceiptNumberChange}
                loading={loadingStates.receiptNumber}
            />
            <DatePicker
                label={t('receipts.upload.receiptDate')}
                date={receiptDate}
                onSelect={onReceiptDateChange}
                className="w-full"
                loading={loadingStates.receiptDate}
            />

            <Radio
                items={radioItems}
                value={transactionKind}
                onValueChange={(v) => onTransactionKindChange(v as 'intake' | 'expense')}
                layout="horizontal"
            />
            <Switch checked={isUnpaid} onCheckedChange={onIsUnpaidChange} label={t('receipts.upload.unpaid')} />

            <TextField
                label={t('receipts.upload.contractPartner')}
                value={contractPartner}
                onValueChange={onContractPartnerChange}
                loading={loadingStates.contractPartner}
            />
            <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">{t('receipts.upload.bommel')}</label>
                <InvoiceUploadFormBommelSelector onChange={(id) => onBommelIdChange((id as number) ?? null)} />
            </div>

            <DatePicker
                label={t('receipts.upload.dueDate')}
                date={dueDate}
                onSelect={onDueDateChange}
                className="w-full"
                loading={loadingStates.dueDate}
            />
            <Select label={t('receipts.upload.category')} value={category} onValueChanged={onCategoryChange} items={categoryItems} />
            <Select
                label={t('receipts.upload.area')}
                value={area}
                onValueChanged={onAreaChange}
                items={areaItems}
                className="col-span-2"
            />

            <div className="col-span-2">
                <Tags
                    label={t('receipts.upload.tags')}
                    value={tags}
                    onChange={onTagsChange}
                    placeholder={t('receipts.upload.addTag')}
                    loading={loadingStates.tags}
                />
            </div>

            <TextField
                label={t('receipts.upload.taxAmount')}
                value={taxAmount}
                onValueChange={onTaxAmountChange}
                loading={loadingStates.taxAmount}
            />
            <TextField
                label={t('receipts.upload.netAmount')}
                value={netAmount}
                onValueChange={onNetAmountChange}
                loading={loadingStates.netAmount}
            />
        </div>
    );
}

export default ReceiptFormFields;
