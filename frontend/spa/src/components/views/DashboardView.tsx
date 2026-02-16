import { CalendarIcon, CheckIcon, ChevronDownIcon } from '@radix-ui/react-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { de, enUS, uk } from 'date-fns/locale';
import { BarChart3, RefreshCw, X, Upload } from 'lucide-react';
import { useMemo, useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

import { LoadingState } from '@/components/common/LoadingState/LoadingState';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/Command';
import { BaseButton } from '@/components/ui/shadecn/BaseButton';
import { Calendar } from '@/components/ui/shadecn/Calendar';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/shadecn/Popover';
import { useMediaQuery } from '@/hooks/use-media-query';
import { cn } from '@/lib/utils';
import apiService from '@/services/ApiService';
import { useBommelsStore } from '@/store/bommels/bommelsStore';
import { useStore } from '@/store/store';
import { getUserFriendlyErrorMessage, isNetworkError } from '@/utils/errorUtils';

function getDefaultStartDate(): string {
    return `${new Date().getFullYear()}-01-01`;
}

function getDefaultEndDate(): string {
    return `${new Date().getFullYear()}-12-31`;
}

function DashboardView() {
    const { t, i18n } = useTranslation();
    const isSmallScreen = useMediaQuery('(max-width: 639px)');
    const { organization } = useStore();
    const { allBommels, rootBommel, loadBommels } = useBommelsStore();
    const navigate = useNavigate();

    // Bommel filter state – defaults to root bommel (includes all sub-bommels)
    const [selectedBommelId, setSelectedBommelId] = useState<number | undefined>(undefined);
    const [openBommel, setOpenBommel] = useState(false);

    const selectedBommel = selectedBommelId ? (allBommels.find((b) => b.id === selectedBommelId) ?? null) : null;

    // Load bommels when organization is available
    useEffect(() => {
        if (organization?.id && allBommels.length === 0) {
            loadBommels(organization.id);
        }
    }, [organization?.id, allBommels.length, loadBommels]);

    // Select root bommel by default once bommels are loaded
    useEffect(() => {
        if (rootBommel?.id && !selectedBommelId) {
            setSelectedBommelId(rootBommel.id);
        }
    }, [rootBommel?.id, selectedBommelId]);

    // Get the appropriate date-fns locale based on the current language
    const getDateLocale = useCallback(() => {
        switch (i18n.language) {
            case 'de':
                return de;
            case 'uk':
                return uk;
            default:
                return enUS;
        }
    }, [i18n.language]);

    // Date range state with current year as default
    const [startDate, setStartDate] = useState<string>(getDefaultStartDate());
    const [endDate, setEndDate] = useState<string>(getDefaultEndDate());

    // Popover state
    const [openStart, setOpenStart] = useState(false);
    const [openEnd, setOpenEnd] = useState(false);

    const handleDateSelect = useCallback(
        (type: 'startDate' | 'endDate', date: Date | undefined) => {
            if (!date) return;
            const formatted = format(date, 'yyyy-MM-dd');
            if (type === 'startDate') {
                setStartDate(formatted);
                // If start date is after end date, adjust end date
                if (formatted > endDate) {
                    setEndDate(formatted);
                }
                setOpenStart(false);
            } else {
                setEndDate(formatted);
                // If end date is before start date, adjust start date
                if (formatted < startDate) {
                    setStartDate(formatted);
                }
                setOpenEnd(false);
            }
        },
        [startDate, endDate]
    );

    const handleBommelSelect = useCallback(
        (currentValue: string) => {
            const bommel = allBommels.find((b) => b.name?.toLowerCase() === currentValue.toLowerCase());
            if (bommel) {
                setSelectedBommelId(bommel.id);
            }
            setOpenBommel(false);
        },
        [allBommels]
    );

    const handleReset = useCallback(() => {
        setStartDate(getDefaultStartDate());
        setEndDate(getDefaultEndDate());
        setSelectedBommelId(rootBommel?.id);
    }, [rootBommel?.id]);

    const isDefaultRange = startDate === getDefaultStartDate() && endDate === getDefaultEndDate() && selectedBommelId === rootBommel?.id;

    const queryClient = useQueryClient();

    // Fetch all transactions for the selected date range
    const {
        data: transactions,
        isLoading,
        error,
        isFetching,
    } = useQuery({
        queryKey: ['transactions', organization?.id, selectedBommelId, startDate, endDate],
        queryFn: () =>
            apiService.orgService.transactionsAll(
                undefined, // area
                selectedBommelId, // bommelId
                undefined, // categoryId
                undefined, // detached
                endDate, // endDate
                undefined, // page
                undefined, // privatelyPaid
                undefined, // search
                10000, // size - large enough to get all transactions
                startDate, // startDate
                undefined // status
            ),
        enabled: !!organization?.id,
    });

    // Aggregate transactions by month
    const chartData = useMemo(() => {
        if (!transactions || transactions.length === 0) {
            return [];
        }

        const monthlyData: Record<string, { income: number; expenses: number }> = {};

        // Initialize all months
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        months.forEach((month) => {
            monthlyData[month] = { income: 0, expenses: 0 };
        });

        // Aggregate transactions by month
        transactions.forEach((transaction) => {
            if (!transaction.transactionTime) return;

            const date = new Date(transaction.transactionTime);
            const monthIndex = date.getMonth();
            const monthKey = months[monthIndex];
            const total = transaction.total || 0;

            if (total > 0) {
                monthlyData[monthKey].income += total;
            } else {
                monthlyData[monthKey].expenses += Math.abs(total);
            }
        });

        // Convert to array for Recharts
        return months.map((month) => ({
            month,
            income: monthlyData[month].income,
            expenses: monthlyData[month].expenses,
        }));
    }, [transactions]);

    // Check if there's any data to display
    const hasData = chartData.some((d) => d.income > 0 || d.expenses > 0);

    // Format dates for display using current locale
    const formattedStart = format(new Date(startDate), 'P', { locale: getDateLocale() });
    const formattedEnd = format(new Date(endDate), 'P', { locale: getDateLocale() });

    return (
        <div className="px-3 py-5 sm:px-7 sm:py-[2.5rem] max-w-screen-xl">
            <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6">{t('dashboard.title')}</h1>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 sm:mb-4 gap-3 sm:gap-4">
                    <h2 className="text-lg sm:text-xl font-semibold">{t('dashboard.incomeExpenseChart')}</h2>

                    <div className="flex flex-wrap items-end gap-2 sm:gap-4">
                        {/* Bommel Filter */}
                        <div className="flex flex-col gap-1 w-full sm:w-auto">
                            <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">{t('dashboard.bommelFilter')}</label>
                            <Popover open={openBommel} onOpenChange={setOpenBommel}>
                                <PopoverTrigger asChild>
                                    <BaseButton
                                        variant="outline"
                                        data-testid="dashboard-bommel-filter"
                                        className={cn(
                                            'w-full sm:w-[180px] h-10 justify-between text-sm font-normal',
                                            'rounded-[var(--radius-l,0.5rem)] border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4',
                                            'focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none'
                                        )}
                                    >
                                        <span className="truncate">
                                            {selectedBommel ? `${selectedBommel.emoji || ''} ${selectedBommel.name}`.trim() : t('common.loading')}
                                        </span>
                                        <ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </BaseButton>
                                </PopoverTrigger>
                                <PopoverContent align="start" side="bottom" sideOffset={4} className="p-0 w-[220px]">
                                    <Command>
                                        <CommandInput placeholder={t('common.search')} className="h-9" />
                                        <CommandList>
                                            <CommandEmpty>{t('bommel.empty')}</CommandEmpty>
                                            <CommandGroup>
                                                {allBommels.map((bommel) => (
                                                    <CommandItem key={bommel.id} value={bommel.name} onSelect={handleBommelSelect}>
                                                        <span className="truncate">
                                                            {bommel.emoji || ''} {bommel.name}
                                                        </span>
                                                        <CheckIcon
                                                            className={cn('ml-auto h-4 w-4', selectedBommelId === bommel.id ? 'opacity-100' : 'opacity-0')}
                                                        />
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>

                        {/* Date Range Filter */}
                        <div className="flex flex-col gap-1 w-full sm:w-auto">
                            <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">{t('dashboard.filterLabel')}</label>
                            <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                                {/* Start Date Picker */}
                                <div className="flex items-center">
                                    <Popover open={openStart} onOpenChange={setOpenStart}>
                                        <PopoverTrigger asChild>
                                            <BaseButton
                                                variant="outline"
                                                data-testid="dashboard-start-date"
                                                className={cn(
                                                    'w-[120px] sm:w-[140px] h-10 justify-between text-sm font-normal',
                                                    'rounded-[var(--radius-l,0.5rem)] border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4',
                                                    'focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none'
                                                )}
                                            >
                                                <span className="truncate">{formattedStart}</span>
                                                <CalendarIcon className="ml-2 h-4 w-4 text-gray-500" />
                                            </BaseButton>
                                        </PopoverTrigger>
                                        <PopoverContent
                                            align="start"
                                            side="bottom"
                                            sideOffset={4}
                                            className="p-0 bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm w-auto"
                                        >
                                            <Calendar
                                                mode="single"
                                                captionLayout="dropdown"
                                                startMonth={new Date(2020, 0)}
                                                endMonth={new Date(2030, 11)}
                                                selected={new Date(startDate)}
                                                onSelect={(date) => handleDateSelect('startDate', date)}
                                                disabled={{ after: new Date(endDate) }}
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>

                                <span className="text-sm text-gray-500">–</span>

                                {/* End Date Picker */}
                                <div className="flex items-center">
                                    <Popover open={openEnd} onOpenChange={setOpenEnd}>
                                        <PopoverTrigger asChild>
                                            <BaseButton
                                                variant="outline"
                                                data-testid="dashboard-end-date"
                                                className={cn(
                                                    'w-[120px] sm:w-[140px] h-10 justify-between text-sm font-normal',
                                                    'rounded-[var(--radius-l,0.5rem)] border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4',
                                                    'focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none'
                                                )}
                                            >
                                                <span className="truncate">{formattedEnd}</span>
                                                <CalendarIcon className="ml-2 h-4 w-4 text-gray-500" />
                                            </BaseButton>
                                        </PopoverTrigger>
                                        <PopoverContent
                                            align="start"
                                            side="bottom"
                                            sideOffset={4}
                                            className="p-0 bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm w-auto"
                                        >
                                            <Calendar
                                                mode="single"
                                                captionLayout="dropdown"
                                                startMonth={new Date(2020, 0)}
                                                endMonth={new Date(2030, 11)}
                                                selected={new Date(endDate)}
                                                onSelect={(date) => handleDateSelect('endDate', date)}
                                                disabled={{ before: new Date(startDate) }}
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>

                                {/* Reset Button */}
                                {!isDefaultRange && (
                                    <BaseButton
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleReset}
                                        data-testid="dashboard-reset-filter"
                                        className="h-10 px-3 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                                    >
                                        <X className="h-4 w-4 mr-1" />
                                        {t('dashboard.resetFilter')}
                                    </BaseButton>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {isLoading && (
                    <div className="flex items-center justify-center h-52 sm:h-96">
                        <LoadingState size="lg" />
                    </div>
                )}

                {error && (
                    <div className="flex flex-col items-center justify-center h-52 sm:h-96 gap-3 sm:gap-4">
                        <div className="rounded-full bg-destructive/10 p-3">
                            <svg className="h-6 w-6 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                />
                            </svg>
                        </div>
                        <p className="text-destructive font-medium" data-testid="dashboard-error-message">
                            {getUserFriendlyErrorMessage(error)}
                        </p>
                        {isNetworkError(error) && <p className="text-sm text-muted-foreground">{t('errors.network.description')}</p>}
                        <BaseButton
                            variant="outline"
                            size="sm"
                            data-testid="dashboard-retry-button"
                            disabled={isFetching}
                            onClick={() =>
                                queryClient.invalidateQueries({ queryKey: ['transactions', organization?.id, selectedBommelId, startDate, endDate] })
                            }
                            className="gap-2"
                        >
                            <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
                            {isFetching ? t('errors.network.retrying') : t('errors.api.retry')}
                        </BaseButton>
                    </div>
                )}

                {!isLoading && !error && !hasData && (
                    <div className="flex flex-col items-center justify-center h-52 sm:h-96 text-gray-500">
                        <div className="rounded-full bg-muted p-4 mb-4">
                            <BarChart3 className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
                        </div>
                        <p className="text-lg font-medium mb-2">{t('dashboard.noData')}</p>
                        <p className="text-sm text-center max-w-sm mb-4">{t('dashboard.noDataHint')}</p>
                        <BaseButton variant="outline" size="sm" onClick={() => navigate('/receipts/new')} className="gap-2">
                            <Upload className="h-4 w-4" />
                            {t('dashboard.uploadFirst')}
                        </BaseButton>
                    </div>
                )}

                {!isLoading && !error && hasData && (
                    <>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                            {t('dashboard.timeRange', { startDate: formattedStart, endDate: formattedEnd })}
                        </p>
                        <ResponsiveContainer width="100%" height={isSmallScreen ? 250 : 400}>
                            <LineChart data={chartData} margin={{ top: 5, right: isSmallScreen ? 10 : 30, left: isSmallScreen ? 5 : 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" />
                                <YAxis />
                                <Tooltip
                                    formatter={(value: number) => `€${value.toFixed(2)}`}
                                    contentStyle={{
                                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                        border: '1px solid #ccc',
                                        borderRadius: '4px',
                                    }}
                                />
                                <Legend />
                                <Line type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} name={t('dashboard.income')} />
                                <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} name={t('dashboard.expenses')} />
                            </LineChart>
                        </ResponsiveContainer>
                    </>
                )}
            </div>
        </div>
    );
}

export default DashboardView;
