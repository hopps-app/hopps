import './BommelCellRenderer.scss';

import { ICellRendererParams } from 'ag-grid-community';
import { useState, useMemo } from 'react';
import { debounce } from 'lodash';

import { useBommelsStore } from '@/store/bommels/bommelsStore';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/shadecn/Popover.tsx';
import Button from '@/components/ui/Button.tsx';
import BommelCellHeader from '@/components/InvoicesTable/BommelCellRenderer/BommelCellHeader.tsx';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import BommelCellList from '@/components/InvoicesTable/BommelCellRenderer/BommelCellList';
import apiService from '@/services/ApiService';

const BommelCellRenderer = ({ value, data }: ICellRendererParams) => {
    const [isPopoverVisible, setIsPopoverVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const { allBommels, isLoading } = useBommelsStore();

    const onPopoverOpenChange = (isOpen: boolean) => {
        setIsPopoverVisible(isOpen);
    };

    const debouncedSearch = debounce((query) => {
        setSearchQuery(query);
    }, 300);

    const memoizedSearch = useMemo(() => debouncedSearch, []);

    const filteredBommels = useMemo(() => {
        if (!searchQuery) return allBommels;
        return allBommels.filter((bommel) => bommel.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [searchQuery, allBommels]);

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
                            <BommelCellList reassignTransaction={reassignTransaction} filteredBommels={filteredBommels} />
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
