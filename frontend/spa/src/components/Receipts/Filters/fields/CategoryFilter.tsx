import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { ReceiptFilterField } from '@/components/Receipts/Filters/ReceiptFilterField';
import SearchSelect, { SearchSelectItem } from '@/components/ui/SearchSelect';
import { useCategories } from '@/hooks/queries';

type CategoryFilterProps = {
    filters: {
        category?: string | null;
    };
    onChange: (key: 'category', value: string | null) => void;
    label?: string;
};

const CategoryFilter = ({ filters, onChange, label }: CategoryFilterProps) => {
    const { t } = useTranslation();
    const { data: categories = [] } = useCategories();

    const categoryItems: SearchSelectItem[] = useMemo(() => categories.map((c) => ({ label: c.name, value: c.name })), [categories]);

    return (
        <ReceiptFilterField label={label}>
            <SearchSelect
                items={categoryItems}
                value={filters.category ?? ''}
                onValueChange={(val) => onChange('category', val || null)}
                placeholder={t('receipts.filters.allCategories')}
                searchPlaceholder={t('receipts.filters.searchPlaceholder')}
            />
        </ReceiptFilterField>
    );
};

export default CategoryFilter;
