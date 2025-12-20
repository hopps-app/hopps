import { useTranslation } from 'react-i18next';

import { SearchFilter } from '@/components/Receipts/Filters/fields/SearchFilter';
import { StatusFilter } from '@/components/Receipts/Filters/fields/StatusFilter';
import { DateRangeFilter } from '@/components/Receipts/Filters/fields/DateRangeFilter';
import ProjectFilter from '@/components/Receipts/Filters/fields/ProjectFilter';
import CategoryFilter from '@/components/Receipts/Filters/fields/CategoryFilter';
import TypeFilter from '@/components/Receipts/Filters/fields/TypeFilter';
import DisplayFilter from '@/components/Receipts/Filters/fields/DisplayFilter';
import { BaseButton } from '@/components/ui/shadecn/BaseButton';
import { ReceiptFiltersState, SetFilterFn } from '@/components/Receipts/types';

type ReceiptFiltersProps = {
    filters: ReceiptFiltersState;
    setFilter: SetFilterFn;
    resetFilters: () => void;
};

export const ReceiptFilters = ({ filters, setFilter, resetFilters }: ReceiptFiltersProps) => {
    const { t } = useTranslation();

    return (
        <div className="rounded-2xl border border-[--grey-200] p-6">
            <div
                className="
                    flex flex-wrap gap-4
                    2xl:grid 2xl:grid-cols-4 2xl:gap-x-8 2xl:gap-y-6
                "
            >
                <SearchFilter value={filters.search} onChange={(v) => setFilter('search', v)} label={t('receipts.filters.searchReceipt')} />
                <DateRangeFilter filters={filters} onChange={setFilter} label={t('receipts.filters.receiptDate')} />
                <ProjectFilter filters={filters} onChange={setFilter} label={t('receipts.filters.bommel')} />
                <DisplayFilter filters={filters} onChange={setFilter} label={t('receipts.filters.displayType')} />
                <CategoryFilter filters={filters} onChange={setFilter} label={t('receipts.filters.category')} />
                <TypeFilter
                    filters={filters.type}
                    onChange={(key, value) => {
                        setFilter('type', { ...filters.type, [key]: value });
                    }}
                    label={t('receipts.filters.type')}
                />
                <StatusFilter filters={filters} onChange={setFilter} label={t('receipts.filters.status')} />

                <div className="flex items-end justify-end w-full">
                    <BaseButton
                        variant="outline"
                        onClick={resetFilters}
                        className="h-10 px-6 text-sm font-medium
                            rounded-[var(--radius-l)]
                            border border-[var(--purple-300)]
                            text-[var(--purple-900)]
                            bg-[var(--purple-100)]
                            hover:bg-[var(--purple-200)]
                            transition-colors w-full
                            lg:w-auto"
                    >
                        {t('receipts.filters.reset')}
                    </BaseButton>
                </div>
            </div>
        </div>
    );
};
