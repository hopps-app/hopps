import { FC, useMemo, useState } from 'react';

import mockReceipts from '@/components/Receipts/mockReceipts';
import ReceiptRow from '@/components/Receipts/ReceiptRow';
import { Receipt, ReceiptFiltersState } from '@/components/Receipts/types';

type ReceiptsListProps = {
    filters: ReceiptFiltersState;
};

const ReceiptsList: FC<ReceiptsListProps> = ({ filters }) => {
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});
    const [checked, setChecked] = useState<Record<string, boolean>>({});

    const toggleRow = (id: string) => {
        setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    const handleCheckChange = (id: string, value: boolean) => {
        setChecked((prev) => ({ ...prev, [id]: value }));
    };

    const filteredReceipts = useMemo(() => {
        const search = filters.search.trim().toLowerCase();
        const category = filters.category?.toLowerCase();

        return mockReceipts.filter((receipt: Receipt) => {
            const matchesSearch =
                !search ||
                [receipt.issuer, receipt.category, receipt.project, receipt.purpose, receipt.reference]
                    .filter(Boolean)
                    .some((field) => field.toLowerCase().includes(search));

            const matchesCategory = !category || receipt.tags.some((tag) => tag.toLowerCase() === category);

            return matchesSearch && matchesCategory;
        });
    }, [filters.search, filters.category]);

    return (
        <ul className="space-y-2">
            {filteredReceipts.length > 0 ? (
                filteredReceipts.map((receipt: Receipt) => (
                    <ReceiptRow
                        key={receipt.id}
                        receipt={receipt}
                        isExpanded={Boolean(expanded[receipt.id])}
                        isChecked={Boolean(checked[receipt.id])}
                        onToggle={toggleRow}
                        onCheckChange={handleCheckChange}
                    />
                ))
            ) : (
                <li className="text-center text-[var(--grey-700)] py-6">No receipts found</li>
            )}
        </ul>
    );
};

export default ReceiptsList;
