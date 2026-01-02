import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { ReceiptFilterField } from '@/components/Receipts/Filters/ReceiptFilterField';
import SearchField from '@/components/ui/SearchField';

type CategoryFilterProps = {
    filters: {
        category?: string | null;
    };
    onChange: (key: 'category', value: string | null) => void;
    label: string;
};

const mockCategories = ['Verein', 'MVP', 'Designwork', 'Mockups', 'Miete', 'Fixkosten', 'Langfristig', 'Bahn', 'Fahrtkosten', 'Zahlung', 'Technisch'];

const CategoryFilter = ({ filters, onChange, label }: CategoryFilterProps) => {
    const { t } = useTranslation();

    const handleSelect = useCallback(
        (name: string) => {
            const newValue = filters.category === name ? null : name;
            onChange('category', newValue);
        },
        [filters.category, onChange]
    );

    return (
        <ReceiptFilterField label={label}>
            <SearchField items={mockCategories} onSearch={handleSelect} placeholder={t('receipts.filters.searchCategoryPlaceholder')} />
        </ReceiptFilterField>
    );
};

export default CategoryFilter;
