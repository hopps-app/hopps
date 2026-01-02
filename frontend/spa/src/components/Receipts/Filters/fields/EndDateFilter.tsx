import { useTranslation } from 'react-i18next';
import { useCallback } from 'react';

import { DatePicker } from '@/components/ui/shadecn/DatePicker';
import { ReceiptFilterField } from '@/components/Receipts/Filters/ReceiptFilterField';

type DateFilterProps = {
    date?: string | null;
    onChange: (key: 'endDate', value: string | null) => void;
};

const EndDateFilter = ({ date, onChange }: DateFilterProps) => {
    const { t } = useTranslation();

    const handleSelect = useCallback(
        (selectedDate: Date | undefined) => {
            onChange('endDate', selectedDate ? selectedDate.toISOString() : null);
        },
        [onChange]
    );

    return (
        <ReceiptFilterField label={t('receipts.filters.endDate')}>
            <DatePicker date={date ? new Date(date) : undefined} onSelect={handleSelect} className="w-full text-sm h-10" />
        </ReceiptFilterField>
    );
};

export default EndDateFilter;
