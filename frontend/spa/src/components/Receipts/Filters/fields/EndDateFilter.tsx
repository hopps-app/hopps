import { useTranslation } from 'react-i18next';
import { useCallback } from 'react';

import { DatePicker } from '@/components/ui/shadecn/DatePicker';
import { ReceiptFilterField } from '@/components/Receipts/Filters/ReceiptFilterField';

type DateFilterProps = {
    date?: string | null;
    onChange: (key: 'endDate', value: string | null) => void;
    label?: string;
};

const EndDateFilter = ({ date, onChange, label }: DateFilterProps) => {
    const { t } = useTranslation();

    const handleSelect = useCallback(
        (selectedDate: Date | undefined) => {
            onChange('endDate', selectedDate ? selectedDate.toISOString() : null);
        },
        [onChange]
    );

    return (
        <ReceiptFilterField label={label}>
            <DatePicker date={date ? new Date(date) : undefined} onSelect={handleSelect} className="w-full text-sm h-10" placeholder={t('datePicker.to')} />
        </ReceiptFilterField>
    );
};

export default EndDateFilter;
