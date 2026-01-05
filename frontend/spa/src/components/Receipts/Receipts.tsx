import ReceiptsList from '@/components/Receipts/ReceiptsList';
import { ReceiptFilters } from '@/components/Receipts/Filters/ReceiptFilters';
import { useReceiptFilters } from '@/components/Receipts/hooks/useReceiptFilters';

const Receipts = () => {
    const { filters, setFilter, resetFilters } = useReceiptFilters();

    return (
        <div className="w-full space-y-4">
            <ReceiptFilters filters={filters} setFilter={setFilter} resetFilters={resetFilters} />
            <ReceiptsList filters={filters} />
        </div>
    );
};

export default Receipts;
