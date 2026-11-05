import { X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { isValidRange, yearOptions, type Period } from '../period';

import { inputCls, pickerFocusCls } from '@/components/Transactions/drawerParts';
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
    // The year or "all" chosen before the free range, restored by its X
    const lastPreset = useRef<Period>(period.kind === 'custom' ? { kind: 'year', year: new Date().getFullYear() } : period);
    if (period.kind !== 'custom') lastPreset.current = period;

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

    const clearRange = () => {
        setPickingRange(false);
        setStartDate('');
        setEndDate('');
        onChange(lastPreset.current);
    };

    const rangeInvalid = pickingRange && startDate !== '' && endDate !== '' && !isValidRange(startDate, endDate);
    const dateCls = cn(inputCls, 'h-9 w-[150px] px-2.5 text-[13px] font-semibold', rangeInvalid && 'border-[var(--negative)]');

    return (
        <div className="flex w-full flex-wrap items-center gap-x-2.5 gap-y-2 sm:w-auto">
            <div className="flex items-center gap-1.5">
                <label htmlFor={id} className="text-[13.5px] font-bold text-foreground">
                    {t('bommel.period.label')}
                </label>
                <InfoTooltip content={t('bommel.period.info')} label={t('bommel.period.info')} />
            </div>
            {/* While a free range is picked the select gives way to the two days; X goes back to the year or "all" from before */}
            {pickingRange ? (
                <div className="flex flex-wrap items-center gap-2">
                    <label className="flex items-center gap-1.5 text-[13px] font-semibold text-muted-foreground">
                        {t('bommel.period.from')}
                        <input id={id} type="date" value={startDate} onChange={(e) => handleDate('start', e.target.value)} className={dateCls} />
                    </label>
                    <label className="flex items-center gap-1.5 text-[13px] font-semibold text-muted-foreground">
                        {t('bommel.period.to')}
                        <input
                            type="date"
                            value={endDate}
                            min={startDate || undefined}
                            onChange={(e) => handleDate('end', e.target.value)}
                            className={dateCls}
                        />
                    </label>
                    <button
                        type="button"
                        onClick={clearRange}
                        aria-label={t('bommel.period.clearRange')}
                        title={t('bommel.period.clearRange')}
                        // -mr-2 cancels the button's padding, so the toolbar gap is measured from the icon like the other controls
                        className="-mr-2 grid h-8 w-8 place-items-center rounded-[var(--btn-radius)] text-muted-foreground transition-colors hover:bg-[var(--surface-sunken)] hover:text-foreground"
                    >
                        <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                </div>
            ) : (
                <BaseSelect value={selectValue} onValueChange={handleSelect}>
                    <SelectTrigger
                        id={id}
                        // Fills the row on small screens, fixed width next to the switches from sm up
                        className={cn(
                            'h-9 min-w-0 flex-1 sm:w-[170px] sm:flex-none rounded-[10px] border-border-soft bg-background-secondary font-semibold',
                            pickerFocusCls
                        )}
                    >
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
            )}
        </div>
    );
}

export default PeriodField;
