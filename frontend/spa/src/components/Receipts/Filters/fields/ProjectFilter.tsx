import InvoiceUploadFormBommelSelector from '@/components/InvoiceUploadForm/InvoiceUploadFormBommelSelector';
import { ReceiptFilterField } from '@/components/Receipts/Filters/ReceiptFilterField';

type ProjectFilterProps = {
    filters: {
        project?: string | null;
    };
    onChange: (key: 'project', value: string | null) => void;
    label?: string;
};

const ProjectFilter = ({ filters, onChange, label }: ProjectFilterProps) => {
    return (
        <ReceiptFilterField label={label}>
            <div className="flex items-center w-full">
                <InvoiceUploadFormBommelSelector
                    value={filters.project ? Number(filters.project) : null}
                    onChange={(id) => onChange('project', id != null ? String(id) : null)}
                />
            </div>
        </ReceiptFilterField>
    );
};

export default ProjectFilter;
