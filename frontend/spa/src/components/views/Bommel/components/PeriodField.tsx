import { useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { isValidRange, yearOptions, type Period } from '../period';

import { inputCls } from '@/components/Transactions/drawerParts';
import { InfoTooltip } from '@/components/ui/InfoTooltip';
import { BaseSelect, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/shadecn/BaseSelect';
import { useTransactions } from '@/hooks/queries/useTransactions';
import { cn } from '@/lib/utils';

const ALL = 'all';
const CUSTOM = 'custom';

interface PeriodFieldProps {
    period: Period;
    onChange: (period: Period) => void;
}

/** The first year with a booked transaction, so only years that can have data are offered. */
function useFirstYear(): number | undefined {
    const { data } = useTransactions({ sortBy: 'transactionTime', sortDir: 'asc', page: 0, size: 1 });
    const first = data?.[0]?.transactionTime;
    return first ? new Date(first).getFullYear() : undefined;
}

/**
 * Period of the amounts on the bommel page: a year (the usual case, one click), all years, or a free range for
 * business years that do not follow the calendar. A free range applies once both days are set and in order.
 */
export function PeriodField({ period, onChange }: PeriodFieldProps) {
    const { t } = useTranslation();
    const id = useId();
    const firstYear = useFirstYear();
    const years = yearOptions(firstYear, new Date(), period.kind === 'year' ? period.year : undefined);

    // The range being typed; it only becomes the period once it is valid.
    const [startDate, setStartDate] = useState(period.kind === 'custom' ? period.startDate : '');
    const [endDate, setEndDate] = useState(period.kind === 'custom' ? period.endDate : '');
    const [pickingRange, setPickingRange] = useState(period.kind === 'custom');

    useEffect(() => {
        if (period.kind === 'custom') {
            setStartDate(period.startDate);
            setEndDate(period.endDate);
            setPickingRange(true);
        }
    }, [period]);

    const selectValue = pickingRange ? CUSTOM : period.kind === 'all' ? ALL : String((period as { year: number }).year);

    const handleSelect = (next: string) => {
        if (next === CUSTOM) {
            setPickingRange(true);
            if (isValidRange(startDate, endDate)) onChange({ kind: 'custom', startDate, endDate });
            return;
        }
        setPickingRange(false);
        onChange(next === ALL ? { kind: 'all' } : { kind: 'year', year: Number(next) });
    };

    const handleDate = (which: 'start' | 'end', value: string) => {
        const nextStart = which === 'start' ? value : startDate;
        const nextEnd = which === 'end' ? value : endDate;
        if (which === 'start') setStartDate(value);
        else setEndDate(value);
        if (isValidRange(nextStart, nextEnd)) onChange({ kind: 'custom', startDate: nextStart, endDate: nextEnd });
    };

    const rangeInvalid = pickingRange && startDate !== '' && endDate !== '' && !isValidRange(startDate, endDate);
    const dateCls = cn(inputCls, 'h-9 w-[150px] px-2.5 text-[13px] font-semibold', rangeInvalid && 'border-[var(--negative)]');

    return (
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2">
            <div className="flex items-center gap-1.5">
                <label htmlFor={id} className="text-[13.5px] font-bold text-foreground">
                    {t('bommel.period.label')}
                </label>
                <InfoTooltip content={t('bommel.period.info')} label={t('bommel.period.info')} />
            </div>
            <BaseSelect value={selectValue} onValueChange={handleSelect}>
                <SelectTrigger id={id} className="h-9 w-[170px] rounded-[10px] border-border-soft bg-background-secondary font-semibold">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {years.map((year) => (
                        <SelectItem key={year} value={String(year)}>
                            {year}
                        </SelectItem>
                    ))}
                    <SelectItem value={ALL}>{t('bommel.period.all')}</SelectItem>
                    <SelectItem value={CUSTOM}>{t('bommel.period.custom')}</SelectItem>
                </SelectContent>
            </BaseSelect>
            {pickingRange && (
                <div className="flex items-center gap-2">
                    <input
                        type="date"
                        aria-label={t('bommel.period.from')}
                        value={startDate}
                        onChange={(e) => handleDate('start', e.target.value)}
                        className={dateCls}
                    />
                    <input
                        type="date"
                        aria-label={t('bommel.period.to')}
                        value={endDate}
                        min={startDate || undefined}
                        onChange={(e) => handleDate('end', e.target.value)}
                        className={dateCls}
                    />
                </div>
            )}
        </div>
    );
}

export default PeriodField;
