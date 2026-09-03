import { useTranslation } from 'react-i18next';

import { PERIOD_IDS, PeriodId } from './periods';

import { BaseSelect, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/shadecn/BaseSelect';

type PeriodSelectProps = {
    value: PeriodId;
    onChange: (value: PeriodId) => void;
};

/**
 * Five presets, no free date range — the dashboard is a one-click overview; arbitrary spans belong
 * to the reports view.
 */
export function PeriodSelect({ value, onChange }: PeriodSelectProps) {
    const { t } = useTranslation();

    return (
        <BaseSelect value={value} onValueChange={(next) => onChange(next as PeriodId)}>
            <SelectTrigger
                aria-label={t('dashboard.periodSelect.label')}
                data-testid="dashboard-period-filter"
                className="h-10 w-full rounded-[13px] border-border-soft bg-background-secondary font-semibold sm:w-[176px]"
            >
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                {PERIOD_IDS.map((period) => (
                    <SelectItem key={period} value={period}>
                        {t(`dashboard.periodSelect.options.${period}`)}
                    </SelectItem>
                ))}
            </SelectContent>
        </BaseSelect>
    );
}
