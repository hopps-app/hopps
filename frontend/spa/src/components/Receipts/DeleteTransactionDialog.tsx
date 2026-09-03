import { AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';

export interface DeleteTransactionDialogProps {
    open: boolean;
    transactionName: string;
    transactionAmount: string;
    /** Replaces the "delete '<name>' (<amount>)?" sentence — used by the bulk path, which deletes several at once. */
    description?: string;
    /** Whether a receipt is linked. Without one, both delete options would do the same thing, so only one is offered. */
    hasReceipt: boolean;
    onDeleteTransactionOnly: () => void;
    onDeleteWithReceipt: () => void;
    onCancel: () => void;
}

// The app's pill buttons. Each option's card is tinted to match its button so the colour alone says which is which:
// neutral = the receipt survives, red = everything goes.
const PILL = 'inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[14px] font-bold transition-colors';
const NEUTRAL_BUTTON = `${PILL} border border-border-soft text-foreground hover:bg-[var(--surface-sunken)]`;
const DESTRUCTIVE_BUTTON = `${PILL} bg-[var(--negative-surface)] text-[var(--negative)] hover:bg-[var(--negative-surface-strong)]`;
const GHOST_BUTTON = `${PILL} text-muted-foreground hover:bg-[var(--surface-sunken)]`;

export function DeleteTransactionDialog({
    open,
    transactionName,
    transactionAmount,
    description,
    hasReceipt,
    onDeleteTransactionOnly,
    onDeleteWithReceipt,
    onCancel,
}: DeleteTransactionDialogProps) {
    const { t } = useTranslation();

    return (
        <Dialog open={open} onOpenChange={(open) => !open && onCancel()}>
            {/* min-w-0 keeps the grid children from widening the panel past its max-width (grid items default to
                min-width:auto, so the button row would otherwise push the content out over the background). */}
            <DialogContent className="sm:max-w-[580px] [&>*]:min-w-0">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-orange-500" />
                        {t('receipts.deleteDialog.title')}
                    </DialogTitle>
                    <DialogDescription>
                        {/* Not every transaction has a name — quoting an empty string reads as a bug, so drop the name entirely. */}
                        {description ??
                            (transactionName.trim()
                                ? t('receipts.deleteDialog.description', { name: transactionName, amount: transactionAmount })
                                : t('receipts.deleteDialog.descriptionNoName', { amount: transactionAmount }))}
                    </DialogDescription>
                </DialogHeader>

                {hasReceipt ? (
                    <div className="flex flex-col gap-2">
                        <div className="rounded-lg border border-border-soft bg-[var(--surface-sunken)] p-3">
                            <p className="text-sm font-bold text-foreground">{t('receipts.deleteDialog.confirmTransactionOnly')}</p>
                            <p className="text-sm text-muted-foreground">{t('receipts.deleteDialog.optionTransactionOnly')}</p>
                        </div>
                        <div className="rounded-lg border border-[var(--negative-border)] bg-[var(--negative-surface)] p-3">
                            <p className="text-sm font-bold text-[var(--negative)]">{t('receipts.deleteDialog.confirmWithReceipt')}</p>
                            <p className="text-sm text-[var(--negative)]">{t('receipts.deleteDialog.optionWithReceipt')}</p>
                        </div>
                    </div>
                ) : (
                    <div className="rounded-lg border border-[var(--negative-border)] bg-[var(--negative-surface)] p-4">
                        <p className="text-sm font-bold text-[var(--negative)]">{t('receipts.deleteDialog.warning')}</p>
                    </div>
                )}

                {/* The panel is sized so all three fit on one row in German; flex-wrap stays as a fallback for
                    narrower viewports and longer translations. gap replaces the default space-x, which would
                    misalign a wrapped line. */}
                <DialogFooter className="sm:flex-wrap sm:gap-2 sm:space-x-0">
                    <button type="button" className={GHOST_BUTTON} onClick={onCancel}>
                        {t('common.cancel')}
                    </button>
                    {hasReceipt ? (
                        <>
                            <button type="button" className={NEUTRAL_BUTTON} onClick={onDeleteTransactionOnly}>
                                {t('receipts.deleteDialog.confirmTransactionOnly')}
                            </button>
                            <button type="button" className={DESTRUCTIVE_BUTTON} onClick={onDeleteWithReceipt}>
                                {t('receipts.deleteDialog.confirmWithReceipt')}
                            </button>
                        </>
                    ) : (
                        <button type="button" className={DESTRUCTIVE_BUTTON} onClick={onDeleteTransactionOnly}>
                            {t('receipts.deleteDialog.confirm')}
                        </button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
