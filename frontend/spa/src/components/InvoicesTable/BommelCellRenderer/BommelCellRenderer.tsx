import './styles/BommelCellRenderer.scss';
import { TransactionUpdateRequest } from '@hopps/api-client';
import { ICellRendererParams } from 'ag-grid-community';
import { useState, useMemo, useEffect, useCallback, memo } from 'react';
import { useTranslation } from 'react-i18next';

import BommelCellList from '@/components/InvoicesTable/BommelCellRenderer/BommelCellList';
import Button from '@/components/ui/Button.tsx';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import SearchField from '@/components/ui/SearchField/SearchField';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/shadecn/Popover.tsx';
import { useToast } from '@/hooks/use-toast';
import apiService from '@/services/ApiService';
import { useBommelsStore } from '@/store/bommels/bommelsStore';

const BommelCellRenderer = ({ data, api, node }: ICellRendererParams) => {
    const { t } = useTranslation();
    const { showError, showSuccess } = useToast();

    const { allBommels, isLoading, setLoading } = useBommelsStore();

    const [isPopoverVisible, setIsPopoverVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const onPopoverOpenChange = (isOpen: boolean) => {
        setIsPopoverVisible(isOpen);
    };

    const filteredBommels = useMemo(() => {
        if (!searchQuery) return allBommels;
        return allBommels.filter((bommel) => bommel?.name?.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [searchQuery, allBommels]);

    const onClosePopover = () => {
        setIsPopoverVisible(false);
    };

    const reassignTransaction = async (bommelId: number) => {
        if (data.bommel === bommelId) return;

        setLoading(true);
        try {
            // Update the transaction with the new bommelId
            await apiService.orgService.transactionsPATCH(data.id, new TransactionUpdateRequest({ bommelId }));
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
            if (node.isHovered() && event.key.toLowerCase() === 'a' && !isPopoverVisible) {
                event.preventDefault();
                setIsPopoverVisible(true);
            } else if (event.key === 'Escape') {
                onClosePopover();
            }
        },
        [isPopoverVisible, node]
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
                <SearchField onSearch={setSearchQuery} onClose={onClosePopover} />
                <div className="w-full flex flex-col justify-between h-44 items-start">
                    <LoadingOverlay isEnabled={isLoading} />
                    {filteredBommels.length ? (
                        <BommelCellList
                            reassignTransaction={async (a) => a && (await reassignTransaction(a))}
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
                            className="mt-2 max-w-32 rounded-[var(--btn-radius)] bg-transparent hover:bg-[var(--accent)]  border-[1px] border-solid border-[var(--border-line)] text-xs text-[var(--border-line)] ml-5 max-h-6"
                        >
                            {t('invoices.assignPopover.newBommel')}
                        </Button>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
};

export default memo(BommelCellRenderer);
