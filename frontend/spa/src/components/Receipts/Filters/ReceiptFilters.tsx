import { useTranslation } from 'react-i18next';

import AreaFilter from '@/components/Receipts/Filters/fields/AreaFilter';
import CategoryFilter from '@/components/Receipts/Filters/fields/CategoryFilter';
import { DateRangeFilter } from '@/components/Receipts/Filters/fields/DateRangeFilter';
import DisplayFilter from '@/components/Receipts/Filters/fields/DisplayFilter';
import ProjectFilter from '@/components/Receipts/Filters/fields/ProjectFilter';
import { StatusFilter } from '@/components/Receipts/Filters/fields/StatusFilter';
import { ReceiptFiltersState, SetFilterFn } from '@/components/Receipts/types';

type ReceiptFiltersProps = {
    filters: ReceiptFiltersState;
    setFilter: SetFilterFn;
    resetFilters: () => void;
};

export const ReceiptFilters = ({ filters, setFilter }: ReceiptFiltersProps) => {
    return (
        <div className="rounded-2xl shadow-sm border border-[#E0E0E0] bg-white px-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-3 gap-y-3">
                <ProjectFilter filters={filters} onChange={setFilter} />
                <CategoryFilter filters={filters} onChange={setFilter} />
                <DateRangeFilter filters={filters} onChange={setFilter} />

                <AreaFilter filters={filters} onChange={setFilter} />
                <StatusFilter filters={filters} onChange={setFilter} />
                <DisplayFilter filters={filters} onChange={setFilter} />
            </div>
        </div>
    );
};
