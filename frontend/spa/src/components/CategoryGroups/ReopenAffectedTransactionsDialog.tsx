import { AlertTriangle } from 'lucide-react';
import { FC } from 'react';
import { useTranslation } from 'react-i18next';

import Button from '@/components/ui/Button';
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
            <DialogContent className="max-w-[calc(100vw-2rem)] rounded-[20px] border-none shadow-[0_2px_6px_rgba(20,20,40,0.12),0_24px_64px_rgba(20,20,40,0.32)] sm:max-w-[620px]">
                <DialogHeader>
                    <DialogTitle className="mb-4 flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-[#B47C18]" />
                        {t('categoryGroups.reopen.title')}
                    </DialogTitle>
                    <DialogDescription>{t('categoryGroups.reopen.description', { count, group: groupName })}</DialogDescription>
                </DialogHeader>
                {/* Cancel on the left, the two decisions together on the right; on narrow screens they stack. */}
                <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
                    <Button variant="outline" size="sm" className="h-10 sm:mr-auto" onClick={onCancel}>
                        {t('common.cancel')}
                    </Button>
                    <Button variant="tonal" size="sm" className="h-10" onClick={onKeep}>
                        {t('categoryGroups.reopen.keep')}
                    </Button>
                    <Button size="sm" className="h-10" onClick={onReopen}>
                        {t('categoryGroups.reopen.confirm')}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default ReopenAffectedTransactionsDialog;
