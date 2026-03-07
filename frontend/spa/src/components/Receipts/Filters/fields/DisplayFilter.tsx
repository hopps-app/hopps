import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { ReceiptFilterField } from '@/components/Receipts/Filters/ReceiptFilterField';
import { Switch } from '@/components/ui/shadecn/Switch';

type DisplayFilterProps = {
    filters: {
        displayAll?: boolean;
    };
    onChange: (key: 'displayAll', value: boolean) => void;
    label?: string;
};

const DisplayFilter = ({ filters, onChange }: DisplayFilterProps) => {
    const { t } = useTranslation();

    const handleToggle = useCallback(
        (checked: boolean) => {
            onChange('displayAll', checked);
        },
        [onChange]
    );

    return (
        <ReceiptFilterField>
            <div className="flex items-center gap-2 h-10 select-none">
                <Switch
                    id="display-all"
                    checked={!!filters.displayAll}
                    onCheckedChange={(checked) => handleToggle(!!checked)}
                    className="data-[state=checked]:bg-[var(--purple-500)] data-[state=unchecked]:bg-[#E0E0E0]"
                />
                <span className="text-sm text-[var(--grey-900)]">{t('receipts.filters.displayAll')}</span>
            </div>
        </ReceiptFilterField>
    );
};

export default DisplayFilter;
