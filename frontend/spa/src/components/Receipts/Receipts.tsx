import { useTranslation } from 'react-i18next';

import { ReceiptFilters } from '@/components/Receipts/Filters/ReceiptFilters';
import { useReceiptFilters } from '@/components/Receipts/hooks/useReceiptFilters';
import ReceiptsList from '@/components/Receipts/ReceiptsList';

const Receipts = () => {
    const { t } = useTranslation();
    const { filters, setFilter, resetFilters } = useReceiptFilters();

    return (
        <div className="w-full space-y-4">
            <h2 className="text-2xl font-semibold">{t('menu.receipts')}</h2>
            <ReceiptFilters filters={filters} setFilter={setFilter} resetFilters={resetFilters} />
            <ReceiptsList filters={filters} />
        </div>
    );
};

export default Receipts;
