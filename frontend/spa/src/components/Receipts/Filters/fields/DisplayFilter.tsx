import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { ReceiptFilterField } from '@/components/Receipts/Filters/ReceiptFilterField';
import { Checkbox } from '@/components/ui/shadecn/Checkbox';

type DisplayFilterProps = {
    filters: {
        displayAll?: boolean;
    };
    onChange: (key: 'displayAll', value: boolean) => void;
    label: string;
};

const DisplayFilter = ({ filters, onChange, label }: DisplayFilterProps) => {
    const { t } = useTranslation();

    const handleToggle = useCallback(
        (checked: boolean) => {
            onChange('displayAll', checked);
        },
        [onChange]
    );

    return (
        <ReceiptFilterField label={label}>
            <div className="flex items-center gap-3 h-10">
                <Checkbox
                    id="display-all"
                    checked={!!filters.displayAll}
                    onCheckedChange={(checked) => handleToggle(!!checked)}
                    className="size-5 rounded-md border border-[var(--grey-600)] 
                               bg-[var(--grey-white)] 
                               data-[state=checked]:bg-[var(--purple-500)] 
                               data-[state=checked]:border-[var(--purple-500)]
                               hover:bg-[var(--grey-400)] 
                               hover:data-[state=checked]:bg-[var(--purple-400)]
                               transition-colors focus-visible:ring-0 focus-visible:outline-none"
                />
                <label htmlFor="display-all" className="text-base font-medium text-[var(--grey-black)] leading-none cursor-pointer select-none">
                    {t('receipts.filters.displayAll')}
                </label>
            </div>
        </ReceiptFilterField>
    );
};

export default DisplayFilter;
