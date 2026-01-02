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
        <div className="rounded-2xl border border-gray-300 p-5">
            <div className="flex items-center gap-3 mb-5">
                <div className="flex-[8]">
                    <SearchFilter value={filters.search} onChange={(v) => setFilter('search', v)} />
                </div>

                <div className="flex-[1]">
                    <Button onClick={handleToggleExpanded} variant="secondary" className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium h-full">
                        {isExpanded ? (
                            <>
                                {t('receipts.filters.hideFilters')}
                                <ChevronUp className="w-4 h-4" />
                            </>
                        ) : (
                            <>
                                {t('receipts.filters.showFilters')}
                                <ChevronDown className="w-4 h-4" />
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {isExpanded && (
                <div className="flex flex-col gap-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StartDateFilter date={filters.startDate} onChange={setFilter} />
                        <EndDateFilter date={filters.endDate} onChange={setFilter} />
                        <CategoryFilter filters={filters} onChange={setFilter} label={t('receipts.filters.category')} />
                        <ProjectFilter filters={filters} onChange={setFilter} label={t('receipts.filters.bommel')} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
                        <TypeFilter
                            filters={filters.type}
                            onChange={(key, value) => {
                                setFilter('type', { ...filters.type, [key]: value });
                            }}
                            label={t('receipts.filters.type')}
                        />
                        <StatusFilter filters={filters} onChange={setFilter} label={t('receipts.filters.status')} />
                        <DisplayFilter filters={filters} onChange={setFilter} />

                        <div className="flex items-end justify-end w-full">
                            <Button variant="secondary" onClick={resetFilters} className="px-6 h-10 text-sm text-gray-700 font-medium">
                                {t('receipts.filters.reset')}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
