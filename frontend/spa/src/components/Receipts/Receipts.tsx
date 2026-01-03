import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import ReceiptsList from '@/components/Receipts/ReceiptsList';
import { ReceiptFilters } from '@/components/Receipts/Filters/ReceiptFilters';
import { useReceiptFilters } from '@/components/Receipts/hooks/useReceiptFilters';
import Header from '../ui/Header';
import Button from '../ui/Button';

const Receipts = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { filters, setFilter, resetFilters } = useReceiptFilters();

    return (
        <div className="w-full space-y-4">
            <div className="flex items-center justify-between">
                <Header title={t('receipts.title')} />
                <Button variant="default" icon="Plus" onClick={() => navigate('/receipts/new')} className="text-sm font-medium whitespace-nowrap">
                    {t('receipts.upload')}
                </Button>
            </div>
            <ReceiptFilters filters={filters} setFilter={setFilter} resetFilters={resetFilters} />
            <ReceiptsList filters={filters} />
        </div>
    );
};

export default Receipts;
