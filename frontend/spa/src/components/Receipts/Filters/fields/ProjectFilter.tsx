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
            <div className="[&_button]:h-10 [&_button]:rounded-xl [&_button]:border-[#d1d5db] [&_button]:py-0 [&_button]:text-sm [&_button]:bg-white [&_button]:text-[#666] [&_button:focus-visible]:outline-none [&_button:focus-visible]:border-[var(--purple-500)] [&_button:focus-visible]:ring-2 [&_button:focus-visible]:ring-[var(--purple-500)]/25">
                <InvoiceUploadFormBommelSelector
                    value={filters.project ? Number(filters.project) : null}
                    onChange={(id) => onChange('project', id != null ? String(id) : null)}
                />
            </div>
        </ReceiptFilterField>
    );
};

export default ProjectFilter;
