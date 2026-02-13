import { AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import Button from '@/components/ui/Button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';

export interface DeleteTransactionDialogProps {
    open: boolean;
    transactionName: string;
    transactionAmount: string;
    onConfirm: () => void;
    onCancel: () => void;
}

export function DeleteTransactionDialog({ open, transactionName, transactionAmount, onConfirm, onCancel }: DeleteTransactionDialogProps) {
    const { t } = useTranslation();

    return (
        <Dialog open={open} onOpenChange={(open) => !open && onCancel()}>
            <DialogContent className="sm:max-w-[450px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-orange-500" />
                        {t('receipts.deleteDialog.title')}
                    </DialogTitle>
                    <DialogDescription>{t('receipts.deleteDialog.description', { name: transactionName, amount: transactionAmount })}</DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                        <p className="text-sm text-orange-800 font-medium">{t('receipts.deleteDialog.warning')}</p>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onCancel}>
                        {t('common.cancel')}
                    </Button>
                    <Button variant="destructive" onClick={onConfirm}>
                        {t('receipts.deleteDialog.confirm')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
