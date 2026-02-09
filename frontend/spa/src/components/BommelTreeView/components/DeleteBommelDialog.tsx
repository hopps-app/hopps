import { AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import Button from '@/components/ui/Button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/RadioGroup';

export type DeleteTransactionHandling = 'unlink' | 'reassign';

export interface DeleteBommelDialogProps {
    open: boolean;
    bommelName: string;
    hasTransactions: boolean;
    onConfirm: (transactionHandling?: DeleteTransactionHandling, reassignToBommelId?: number) => void;
    onCancel: () => void;
}

export function DeleteBommelDialog({ open, bommelName, hasTransactions, onConfirm, onCancel }: DeleteBommelDialogProps) {
    const { t } = useTranslation();
    const [transactionHandling, setTransactionHandling] = useState<DeleteTransactionHandling>('unlink');

    const handleConfirm = () => {
        if (hasTransactions) {
            onConfirm(transactionHandling);
        } else {
            onConfirm();
        }
    };

    return (
        <Dialog open={open} onOpenChange={(open) => !open && onCancel()}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-orange-500" />
                        {t('organization.structure.deleteDialog.title')}
                    </DialogTitle>
                    <DialogDescription>{t('organization.structure.deleteDialog.description', { name: bommelName })}</DialogDescription>
                </DialogHeader>

                {hasTransactions && (
                    <div className="py-4 space-y-4">
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                            <p className="text-sm text-orange-800 font-medium">{t('organization.structure.deleteDialog.hasTransactionsWarning')}</p>
                        </div>

                        <div className="space-y-3">
                            <label className="text-sm font-medium">{t('organization.structure.deleteDialog.transactionHandlingLabel')}</label>
                            <RadioGroup value={transactionHandling} onValueChange={(value) => setTransactionHandling(value as DeleteTransactionHandling)}>
                                <div className="flex items-start space-x-2 p-3 rounded-lg border hover:bg-gray-50 cursor-pointer">
                                    <RadioGroupItem value="unlink" id="unlink" />
                                    <label htmlFor="unlink" className="flex-1 cursor-pointer">
                                        <div className="font-medium text-sm">{t('organization.structure.deleteDialog.unlinkOption')}</div>
                                        <div className="text-xs text-gray-500">{t('organization.structure.deleteDialog.unlinkDescription')}</div>
                                    </label>
                                </div>

                                <div className="flex items-start space-x-2 p-3 rounded-lg border hover:bg-gray-50 cursor-pointer opacity-50 pointer-events-none">
                                    <RadioGroupItem value="reassign" id="reassign" disabled />
                                    <label htmlFor="reassign" className="flex-1">
                                        <div className="font-medium text-sm">{t('organization.structure.deleteDialog.reassignOption')}</div>
                                        <div className="text-xs text-gray-500">{t('organization.structure.deleteDialog.reassignDescription')}</div>
                                        <div className="text-xs text-gray-400 mt-1 italic">{t('organization.structure.deleteDialog.comingSoon')}</div>
                                    </label>
                                </div>
                            </RadioGroup>
                        </div>
                    </div>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={onCancel}>
                        {t('common.cancel')}
                    </Button>
                    <Button variant="destructive" onClick={handleConfirm}>
                        {t('organization.structure.deleteDialog.confirm')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
