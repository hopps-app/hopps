import { useTranslation } from 'react-i18next';

import InvoiceUploadFormBommelSelector from '@/components/InvoiceUploadForm/InvoiceUploadFormBommelSelector';
import AreaFilter from '@/components/Receipts/Filters/fields/AreaFilter';
import CategoryFilter from '@/components/Receipts/Filters/fields/CategoryFilter';
import { DateRangeFilter } from '@/components/Receipts/Filters/fields/DateRangeFilter';
import DisplayFilter from '@/components/Receipts/Filters/fields/DisplayFilter';
import { StatusFilter } from '@/components/Receipts/Filters/fields/StatusFilter';
import { ReceiptFilterField } from '@/components/Receipts/Filters/ReceiptFilterField';
import { ReceiptFiltersState, SetFilterFn } from '@/components/Receipts/types';

type ReceiptFiltersProps = {
    filters: ReceiptFiltersState;
    setFilter: SetFilterFn;
    resetFilters: () => void;
};

export const ReceiptFilters = ({ filters, setFilter }: ReceiptFiltersProps) => {
    const { t } = useTranslation();

    return (
        <div className="rounded-2xl border border-[#A7A7A7] bg-white p-5">
            {/* Dropdown filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="sm:col-span-2">
                    <DateRangeFilter filters={filters} onChange={setFilter} label={t('receipts.filters.receiptDate')} />
                </div>
                <ReceiptFilterField label={t('receipts.filters.bommel')}>
                    <div className="[&_button]:h-10 [&_button]:rounded-xl [&_button]:border-[#A7A7A7] [&_button]:py-0 [&_button]:text-sm [&_button]:bg-white">
                        <InvoiceUploadFormBommelSelector
                            value={filters.project ? Number(filters.project) : null}
                            onChange={(id) => setFilter('project', id != null ? String(id) : null)}
                        />
                    </div>
                </ReceiptFilterField>
                <CategoryFilter filters={filters} onChange={setFilter} label={t('receipts.filters.category')} />
                <AreaFilter filters={filters} onChange={setFilter} label={t('receipts.filters.area')} />
                <StatusFilter filters={filters} onChange={setFilter} label={t('receipts.filters.status')} />
                <DisplayFilter filters={filters} onChange={setFilter} label={t('receipts.filters.displayType')} />
            </div>
        </div>
    );
};
