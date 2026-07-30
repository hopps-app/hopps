import { AlertTriangle } from 'lucide-react';
import { FC } from 'react';
import { useTranslation } from 'react-i18next';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/Dialog';

type ReopenAffectedTransactionsDialogProps = {
    open: boolean;
    count: number;
    groupName: string;
    /** Save the group AND reset the affected confirmed transactions to draft. */
    onReopen: () => void;
    /** Save the group but leave the confirmed transactions untouched. */
    onKeep: () => void;
    onCancel: () => void;
};

/**
 * Asks whether to reset already-confirmed transactions to draft when a category group becomes mandatory for bommels
 * that already carry bookkeeping — so the now-required value can be filled in.
 */
const ReopenAffectedTransactionsDialog: FC<ReopenAffectedTransactionsDialogProps> = ({ open, count, groupName, onReopen, onKeep, onCancel }) => {
    const { t } = useTranslation();

    return (
        <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
            <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-[#B47C18]" />
                        {t('categoryGroups.reopen.title')}
                    </DialogTitle>
                    <DialogDescription>{t('categoryGroups.reopen.description', { count, group: groupName })}</DialogDescription>
                </DialogHeader>
                <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="inline-flex h-10 w-full items-center justify-center whitespace-nowrap rounded-xl border border-[#d1d5db] px-4 text-sm font-medium text-[var(--font-color)] transition-colors hover:bg-[#F1F1F4] sm:w-auto"
                    >
                        {t('common.cancel')}
                    </button>
                    <button
                        type="button"
                        onClick={onKeep}
                        className="inline-flex h-10 w-full items-center justify-center whitespace-nowrap rounded-xl border border-[#d1d5db] px-4 text-sm font-medium text-[var(--font-color)] transition-colors hover:bg-[#F1F1F4] sm:w-auto"
                    >
                        {t('categoryGroups.reopen.keep')}
                    </button>
                    <button
                        type="button"
                        onClick={onReopen}
                        className="inline-flex h-10 w-full items-center justify-center whitespace-nowrap rounded-xl bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary/90 sm:w-auto"
                    >
                        {t('categoryGroups.reopen.confirm')}
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default ReopenAffectedTransactionsDialog;
