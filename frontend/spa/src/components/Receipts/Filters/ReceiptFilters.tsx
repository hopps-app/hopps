import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp } from 'lucide-react';

import { ReceiptFiltersState, SetFilterFn } from '@/components/Receipts/types';
import { SearchFilter } from '@/components/Receipts/Filters/fields/SearchFilter';
import { StatusFilter } from '@/components/Receipts/Filters/fields/StatusFilter';
import StartDateFilter from './fields/StartDateFilter';
import EndDateFilter from './fields/EndDateFilter';
import ProjectFilter from '@/components/Receipts/Filters/fields/ProjectFilter';
import CategoryFilter from '@/components/Receipts/Filters/fields/CategoryFilter';
import TypeFilter from '@/components/Receipts/Filters/fields/TypeFilter';
import DisplayFilter from '@/components/Receipts/Filters/fields/DisplayFilter';
import Button from '@/components/ui/Button';

type ReceiptFiltersProps = {
    filters: ReceiptFiltersState;
    setFilter: SetFilterFn;
    resetFilters: () => void;
};

export const ReceiptFilters = ({ filters, setFilter, resetFilters }: ReceiptFiltersProps) => {
    const { t } = useTranslation();
    const [isExpanded, setIsExpanded] = useState(false);
    const handleToggleExpanded = () => {
        const newValue = !isExpanded;
        if (isExpanded) {
            setIsExpanded(newValue);
        } else {
            setIsExpanded(newValue);
        }
    };

    return (
        <div className="rounded-[20px] border border-gray-300 p-4 shadow-lg">
            <div
                className="
                  grid w-full gap-4 items-end
                  grid-cols-1
                  md:grid-cols-2
                  xl:grid-cols-[1.6fr_1.2fr_1.2fr_1.6fr]
                  2xl:grid-cols-[1.8fr_1fr_1fr_1.8fr]"
            >
                <SearchFilter value={filters.search} onChange={(v) => setFilter('search', v)} label={t('receipts.filters.searchReceipt')} />

                <StartDateFilter date={filters.startDate} onChange={setFilter} label={t('receipts.filters.receiptDate')} />
                <EndDateFilter date={filters.endDate} onChange={setFilter} />

                <div className="flex items-end gap-2 w-full">
                    <div className="flex-1 min-w-0">
                        <ProjectFilter filters={filters} onChange={setFilter} label={t('receipts.filters.bommel')} />
                    </div>

                    <Button onClick={handleToggleExpanded} variant="secondary" className="h-10 w-10 shrink-0 flex items-center justify-center p-0">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>

                    {/*
                    {isExpanded ? (
                        <Button onClick={handleToggleExpanded} variant="secondary" className="h-10 w-10 shrink-0 flex items-center justify-center p-0">
                            <SlidersHorizontal className="w-4 h-4" />
                        </Button>
                    ) : (
                        <Button
                            onClick={handleToggleExpanded}
                            className="h-10 w-10 shrink-0 flex items-center justify-center p-0 bg-transparent border border-gray-400 hover:bg-[var(--purple-100)] text-[var(--grey-900)] hover:text-[var(--grey-black)]"
                        >
                            <SlidersHorizontal className="w-4 h-4" />
                        </Button>
                    )} */}
                </div>
            </div>

            {isExpanded && (
                <div
                    className="
                        grid w-full items-end gap-4 mt-3
                        grid-cols-1
                        xl:grid-cols-[1.6fr_1.2fr_1.2fr_1.6fr]
                        2xl:grid-cols-[1.8fr_1fr_1fr_1.8fr]"
                >
                    <CategoryFilter filters={filters} onChange={setFilter} label={t('receipts.filters.category')} />

                    <TypeFilter
                        filters={filters.type}
                        onChange={(key, value) => {
                            setFilter('type', { ...filters.type, [key]: value });
                        }}
                        label={t('receipts.filters.type')}
                    />

                    <StatusFilter filters={filters} onChange={setFilter} label={t('receipts.filters.status')} />

                    <div className="flex items-end justify-between w-full">
                        <DisplayFilter filters={filters} onChange={setFilter} label={t('receipts.filters.displayType')} />

                        <Button variant="secondary" onClick={resetFilters} className="h-10 px-6 text-sm text-gray-700 font-medium shrink-0">
                            {t('receipts.filters.reset')}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};
