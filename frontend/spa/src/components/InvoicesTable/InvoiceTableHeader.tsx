import { FC } from 'react';
import { useTranslation } from 'react-i18next';

import Button from '@/components/ui/Button';
import SearchField from '@/components/ui/SearchField/SearchField';

type InvoiceTableHeaderPropsType = {
    onUploadInvoiceChange: () => void;
    setSearchQuery: (query: string) => void;
};

const InvoiceTableHeader: FC<InvoiceTableHeaderPropsType> = ({ setSearchQuery, onUploadInvoiceChange }) => {
    const { t } = useTranslation();

    return (
        <div className="flex flex-row gap-8 max-h-12 items-center">
            <SearchField onSearch={setSearchQuery} />
            <Button className="min-w-28 p-0 flex items-center h-8 text-xs" icon="Plus" onClick={onUploadInvoiceChange}>
                {t('invoices.table.newInvoice')}
            </Button>
        </div>
    );
};

export default InvoiceTableHeader;
