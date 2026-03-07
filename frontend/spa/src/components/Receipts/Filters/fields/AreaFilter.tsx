import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { ReceiptFilterField } from '@/components/Receipts/Filters/ReceiptFilterField';
import SearchSelect, { SearchSelectItem } from '@/components/ui/SearchSelect';

const AREA_VALUES = ['IDEELL', 'ZWECKBETRIEB', 'VERMOEGENSVERWALTUNG', 'WIRTSCHAFTLICH'] as const;

type AreaFilterProps = {
    filters: {
        area?: string | null;
    };
    onChange: (key: 'area', value: string | null) => void;
    label?: string;
};

const AreaFilter = ({ filters, onChange, label }: AreaFilterProps) => {
    const { t } = useTranslation();

    const areaItems: SearchSelectItem[] = useMemo(
        () =>
            AREA_VALUES.map((value) => ({
                value,
                label: t(`receipts.areas.${value.toLowerCase()}`),
            })),
        [t]
    );

    return (
        <ReceiptFilterField label={label}>
            <SearchSelect
                items={areaItems}
                value={filters.area ?? ''}
                onValueChange={(val) => onChange('area', val || null)}
                placeholder={t('receipts.filters.allAreas')}
                hideSearch
            />
        </ReceiptFilterField>
    );
};

export default AreaFilter;
