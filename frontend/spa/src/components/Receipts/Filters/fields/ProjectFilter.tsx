import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import SearchField from '@/components/ui/SearchField';
import { ReceiptFilterField } from '@/components/Receipts/Filters/ReceiptFilterField';

type ProjectFilterProps = {
    filters: {
        project?: string | null;
    };
    onChange: (key: 'project', value: string | null) => void;
    label: string;
};

const mockProjects = [
    { id: 'proj1', name: 'Hopps' },
    { id: 'proj2', name: 'Reisekosten' },
    { id: 'proj3', name: 'IT Infrastruktur' },
    { id: 'proj4', name: 'Marketing Q4' },
];

const ProjectFilter = ({ filters, onChange, label }: ProjectFilterProps) => {
    const { t } = useTranslation();

    const handleSelect = useCallback(
        (id: string) => {
            const newValue = filters.project === id ? null : id;
            onChange('project', newValue);
        },
        [filters.project, onChange]
    );

    return (
        <ReceiptFilterField label={label}>
            <SearchField items={mockProjects.map((p) => p.name)} onSearch={handleSelect} placeholder={t('receipts.filters.searchBommelPlaceholder')} />
        </ReceiptFilterField>
    );
};

export default ProjectFilter;
