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
        (key: 'unpaid' | 'draft' | 'unassigned', checked: boolean) => {
            onChange('status', { ...filters.status, [key]: checked });
        },
        [filters.status, onChange]
    );

    return (
        <ReceiptFilterField label={label}>
            <div className="flex items-center gap-4 h-10 flex-wrap">
                <label htmlFor="status-unpaid" className="flex items-center gap-2 cursor-pointer select-none">
                    <Switch
                        id="status-unpaid"
                        checked={filters.status.unpaid}
                        onCheckedChange={(checked: boolean) => handleToggle('unpaid', checked)}
                        className="data-[state=checked]:bg-[var(--purple-500)]"
                    />
                    <span className="text-sm text-[var(--grey-900)]">
                        {t('receipts.filters.onlyUnpaid')}
                    </span>
                </label>

                <label htmlFor="status-draft" className="flex items-center gap-2 cursor-pointer select-none">
                    <Switch
                        id="status-draft"
                        checked={filters.status.draft}
                        onCheckedChange={(checked: boolean) => handleToggle('draft', checked)}
                        className="data-[state=checked]:bg-[var(--purple-500)]"
                    />
                    <span className="text-sm text-[var(--grey-900)]">
                        {t('receipts.filters.drafts')}
                    </span>
                </label>

                <label htmlFor="status-unassigned" className="flex items-center gap-2 cursor-pointer select-none">
                    <Switch
                        id="status-unassigned"
                        checked={filters.status.unassigned}
                        onCheckedChange={(checked: boolean) => handleToggle('unassigned', checked)}
                        className="data-[state=checked]:bg-[var(--purple-500)]"
                    />
                    <span className="text-sm text-[var(--grey-900)]">
                        {t('receipts.filters.unassigned')}
                    </span>
                </label>
            </div>
        </ReceiptFilterField>
    );
};
