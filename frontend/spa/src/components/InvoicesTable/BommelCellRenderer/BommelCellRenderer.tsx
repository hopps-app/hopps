import './BommelCellRenderer.scss';

import { ICellRendererParams } from 'ag-grid-community';
import { useState, useMemo } from 'react';
import { debounce } from 'lodash';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/shadecn/Popover.tsx';
import Button from '@/components/ui/Button.tsx';
import BommelCellHeader from '@/components/InvoicesTable/BommelCellRenderer/BommelCellHeader.tsx';
import { useBommels } from '@/hooks/useBommels';
import { Bommel } from '@/services/api/types/Bommel';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import apiService from '@/services/ApiService';

const BommelCellRenderer = ({ value, data }: ICellRendererParams) => {
    const [isPopoverVisible, setIsPopoverVisible] = useState(false);

    const [searchQuery, setSearchQuery] = useState('');

    const { bommels, isLoading } = useBommels();

    const onPopoverOpenChange = (isOpen: boolean) => {
        setIsPopoverVisible(isOpen);
    };

    const debouncedSearch = debounce((query) => {
        setSearchQuery(query);
    }, 300);

    const memoizedSearch = useMemo(() => debouncedSearch, []);

    const filteredBommels = useMemo(() => {
        if (!searchQuery) return bommels;
        return bommels.filter((bommel) => bommel.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [searchQuery, bommels]);

    const onClosePopover = () => {
        setIsPopoverVisible(false);
    };

    const reassignTransaction = async (bommelId: number) => {
        const response = await apiService.invoices.reassignTransaction(bommelId, data.id);
        console.log('RESPONSE: ', response);
    };

    if (!value) {
        return (
            <Popover onOpenChange={onPopoverOpenChange} open={isPopoverVisible}>
                <PopoverTrigger asChild>
                    <Button className="min-w-24 p-0 flex items-center h-6 text-xs" icon="Plus" onClick={() => console.log('Add Bommel for invoice', data)}>
                        Assign
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="assign-popover">
                    <BommelCellHeader onSearch={memoizedSearch} onClose={onClosePopover} />

                    <div className="w-full flex flex-col justify-between h-44 items-start">
                        <LoadingOverlay isEnabled={isLoading} />
                        {filteredBommels.length ? (
                            <ul className="w-full max-h-44 overflow-scroll">
                                {filteredBommels.map((bommel: Bommel) => {
                                    return (
                                        <li
                                            key={bommel.id}
                                            className="w-full py-2 pl-5 border-b-[1px] border-b-[var(--separator)] last-of-type:border-none pr-5 text-sm hover:bg-[var(--hover-effect)] "
                                            onClick={() => reassignTransaction(bommel.id)}
                                        >
                                            <span>{bommel.name}</span>
                                        </li>
                                    );
                                })}
                            </ul>
                        ) : (
                            <span className="px-2">No available bommels</span>
                        )}
                        <div className="w-full border-t-[1px] border-t-[var(--separator)] border-solid">
                            <Button
                                icon="Plus"
                                className="mt-2 max-w-32 rounded-[10px] bg-transparent hover:bg-[var(--accent)]  border-[1px] border-solid border-[var(--border-line)] text-xs text-[var(--border-line)] ml-5 max-h-6"
                            >
                                new Bommel
                            </Button>
                        </div>
                    </div>
                </PopoverContent>
            </Popover>
        );
    }

    return value;
};

export default BommelCellRenderer;
