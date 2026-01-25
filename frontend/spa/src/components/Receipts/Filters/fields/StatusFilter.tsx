import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { ReceiptFilterField } from '@/components/Receipts/Filters/ReceiptFilterField';
import { ReceiptFiltersState, SetFilterFn } from '@/components/Receipts/types';
import { Switch } from '@/components/ui/shadecn/Switch';

interface StatusFilterProps {
    filters: ReceiptFiltersState;
    onChange: SetFilterFn;
    label: string;
}

export const StatusFilter = ({ filters, onChange, label }: StatusFilterProps) => {
    const { t } = useTranslation();

    const handleToggle = useCallback(
        (key: 'unpaid' | 'draft', checked: boolean) => {
            onChange('status', { ...filters.status, [key]: checked });
        },
        [filters.status, onChange]
    );

    return (
        <ReceiptFilterField label={label}>
            <div className="flex items-center gap-6 h-10 xl:min-w-[350px]">
                <div className="flex items-center gap-2 flex-1">
                    <Switch
                        id="status-unpaid"
                        checked={filters.status.unpaid}
                        onCheckedChange={(checked: boolean) => handleToggle('unpaid', checked)}
                        className="data-[state=checked]:bg-[var(--purple-500)]"
                    />
                    <label htmlFor="status-unpaid" className="text-base font-medium text-[var(--grey-black)] leading-none cursor-pointer select-none">
                        {t('receipts.filters.onlyUnpaid')}
                    </label>
                </div>

                <div className="flex items-center gap-2 flex-1">
                    <Switch
                        id="status-draft"
                        checked={filters.status.draft}
                        onCheckedChange={(checked: boolean) => handleToggle('draft', checked)}
                        className="data-[state=checked]:bg-[var(--purple-500)]"
                    />
                    <label htmlFor="status-draft" className="text-base font-medium text-[var(--grey-black)] leading-none cursor-pointer select-none">
                        {t('receipts.filters.drafts')}
                    </label>
                </div>
            </div>
        </ReceiptFilterField>
    );
};
