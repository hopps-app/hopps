import { useTranslation } from 'react-i18next';
import { useCallback } from 'react';

import { DatePicker } from '@/components/ui/shadecn/DatePicker';
import { ReceiptFilterField } from '@/components/Receipts/Filters/ReceiptFilterField';

type DateRangeFilterProps = {
    filters: {
        startDate?: string | null;
        endDate?: string | null;
    };
    onChange: (key: 'startDate' | 'endDate', value: string | null) => void;
    label: string;
};

export const DateRangeFilter = ({ filters, onChange, label }: DateRangeFilterProps) => {
    const { t } = useTranslation();

    const handleSelect = useCallback(
        (type: 'startDate' | 'endDate', date: Date | undefined) => {
            onChange(type, date ? date.toISOString() : null);
        },
        [onChange]
    );

    return (
        <ReceiptFilterField label={label}>
            <div className="flex w-full items-center gap-2">
                {/* Start Date Picker */}
                <DatePicker
                    date={filters.startDate ? new Date(filters.startDate) : undefined}
                    onSelect={(date: Date | undefined) => handleSelect('startDate', date)}
                    placeholder={t('receipts.filters.startDate')}
                    className="w-full text-sm"
                />

                {/* End Date Picker */}
                <DatePicker
                    date={filters.endDate ? new Date(filters.endDate) : undefined}
                    onSelect={(date: Date | undefined) => handleSelect('endDate', date)}
                    placeholder={t('receipts.filters.endDate')}
                    className="w-full text-sm"
                />
            </div>
        </ReceiptFilterField>
    );
};
