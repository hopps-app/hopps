import './BommelCellRenderer.scss';

import { ICellRendererParams } from 'ag-grid-community';
import { useEffect, useState } from 'react';

import { useStore } from '@/store/store.ts';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/shadecn/Popover.tsx';
import Button from '@/components/ui/Button.tsx';
import BommelCellHeader from '@/components/InvoicesTable/BommelCellRenderer/BommelCellHeader.tsx';
import { useBommels } from '@/hooks/useBommels';
import { Bommel } from '@/services/api/types/Bommel';
import organizationTreeService from '@/services/OrganizationTreeService';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';

const BommelCellRenderer = ({ value, data }: ICellRendererParams) => {
    const [isPopoverVisible, setIsPopoverVisible] = useState(false);
    const [rootBommel, setRootBommel] = useState<Bommel | null>(null);
    const store = useStore();

    const { bommels, isLoading } = useBommels(rootBommel?.id);

    useEffect(() => {
        const organization = store.organization;
        if (!organization?.id) return;

        organizationTreeService.ensureRootBommelCreated(organization.id).then((bommel) => {
            if (bommel) setRootBommel(bommel);
        });
    }, [store.organization]);

    const onPopoverOpenChange = (isOpen: boolean) => {
        setIsPopoverVisible(isOpen);
    };

    const onSearchChange = (query) => {
        console.log(query);
    };

    useEffect(() => console.log('BOMMELS: ', bommels), [bommels]);

    if (!value) {
        return (
            <Popover onOpenChange={onPopoverOpenChange} open={isPopoverVisible}>
                <PopoverTrigger asChild>
                    <Button className="min-w-24 p-0 flex items-center h-6 text-xs" icon="Plus" onClick={() => console.log('Add Bommel for invoice', data)}>
                        Assign
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="assign-popover">
                    <BommelCellHeader onSearch="onSearchChange" />

                    <div className="w-full flex gap-2 flex-col justify-between min-h-44 items-start pb-2">
                        <LoadingOverlay isEnabled={isLoading} />

                        <ul className="w-full max-h-44 overflow-scroll border-b-[1px] border-b-[var(--separator)] border-solid border-">
                            {bommels.map((bommel: Bommel) => {
                                return (
                                    <li key={bommel.id} className="w-full py-2 pl-5 font-reddit pr-5 text-sm hover:bg-[var(--hover-effect)] ">
                                        <span>{bommel.name}</span>
                                    </li>
                                );
                            })}
                        </ul>

                        <Button
                            icon="Plus"
                            className="max-w-32 rounded-[10px] bg-transparent hover:bg-[var(--accent)]  border-[1px] border-solid border-[var(--border-line)] font-reddit text-xs text-[var(--border-line)] ml-5 max-h-8"
                        >
                            new Bommel
                        </Button>
                    </div>
                </PopoverContent>
            </Popover>
        );
    }

    return value;
};

export default BommelCellRenderer;
