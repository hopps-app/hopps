import './BommelCellRenderer.scss';
import { ICellRendererParams } from 'ag-grid-community';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { debounce } from 'lodash';
import { useTranslation } from 'react-i18next';

import { useBommelsStore } from '@/store/bommels/bommelsStore';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/shadecn/Popover.tsx';
import Button from '@/components/ui/Button.tsx';
import BommelCellHeader from '@/components/InvoicesTable/BommelCellRenderer/BommelCellHeader.tsx';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import BommelCellList from '@/components/InvoicesTable/BommelCellRenderer/BommelCellList';
import apiService from '@/services/ApiService';
import { useToast } from '@/hooks/use-toast';

const BommelCellRenderer = ({ data, api }: ICellRendererParams) => {
    const { t } = useTranslation();
    const { showError, showSuccess } = useToast();

    const { allBommels, isLoading, setLoading } = useBommelsStore();

    const [isPopoverVisible, setIsPopoverVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const onPopoverOpenChange = (isOpen: boolean) => {
        setIsPopoverVisible(isOpen);
    };

    const debouncedSearch = useCallback(
        debounce((query) => {
            setSearchQuery(query);
        }, 300),
        [setSearchQuery]
    );

    const filteredBommels = useMemo(() => {
        if (!searchQuery) return allBommels;
        return allBommels.filter((bommel) => bommel.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [searchQuery, allBommels]);

    const onClosePopover = () => {
        setIsPopoverVisible(false);
    };

    const reassignTransaction = async (bommelId: number) => {
        if (data.bommel === bommelId) return;

        setLoading(true);
        try {
            await apiService.invoices.reassignTransaction(bommelId, data.id);
            showSuccess(`${t('invoices.assignPopover.successAssign')}`);
            await api.applyTransaction({
                update: [{ ...data, bommel: bommelId }],
            });
            onClosePopover();
        } catch (error) {
            showError(`${t('invoices.assignPopover.failedAssign')}`);
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const onKeyPressPopover = useCallback(
        (event: KeyboardEvent) => {
            if (event.key.toLowerCase() === 'a' && !isPopoverVisible) {
                event.preventDefault();
                setIsPopoverVisible(true);
            } else if (event.key === 'Escape') {
                onClosePopover();
            }
        },
        [isPopoverVisible]
    );

    useEffect(() => {
        document.addEventListener('keydown', onKeyPressPopover);
        return () => document.removeEventListener('keydown', onKeyPressPopover);
    }, [onKeyPressPopover]);

    return (
        <Popover onOpenChange={onPopoverOpenChange} open={isPopoverVisible}>
            <PopoverTrigger asChild>
                <Button className="min-w-28 p-0 flex items-center h-6 text-xs" icon="Plus">
                    {t('invoices.assignPopover.reassign')}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="assign-popover">
                <BommelCellHeader onSearch={debouncedSearch} onClose={onClosePopover} />

                <div className="w-full flex flex-col justify-between h-44 items-start">
                    <LoadingOverlay isEnabled={isLoading} />
                    {filteredBommels.length ? (
                        <BommelCellList
                            reassignTransaction={reassignTransaction}
                            filteredBommels={filteredBommels}
                            currentBommelId={data.bommel}
                            isPopoverVisible={isPopoverVisible}
                        />
                    ) : (
                        <span className="px-2">{t('invoices.assignPopover.noBommels')}</span>
                    )}
                    <div className="w-full border-t-[1px] border-t-[var(--separator)] border-solid">
                        <Button
                            icon="Plus"
                            className="mt-2 max-w-32 rounded-[10px] bg-transparent hover:bg-[var(--accent)]  border-[1px] border-solid border-[var(--border-line)] text-xs text-[var(--border-line)] ml-5 max-h-6"
                        >
                            {t('invoices.assignPopover.newBommel')}
                        </Button>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
};

export default BommelCellRenderer;
