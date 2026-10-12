import { RotateCcw, ShieldCheck } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { descendantsOf, useDeleteImpact } from '../hooks/useDeleteImpact';
import { TreeNodeData } from '../types';

import { Skeleton } from '@/components/Dashboard/SectionState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { NetworkIcon } from '@/components/ui/icons/lineIcons';

/** Sub-Bommel listed by name before "und N weitere" */
const MAX_NAMES = 3;

export interface DeleteBommelDialogProps {
    open: boolean;
    node: TreeNodeData;
    /** The delete request is running */
    deleting?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

/**
 * Confirms deleting a Bommel and says exactly what happens: its sub-Bommel are deleted with it, while the transactions
 * and receipts booked on any of them are kept and only lose their Bommel (the backend detaches them). Confirming requires
 * a Bommel, so whatever was confirmed goes back to draft / unchecked.
 */
export function DeleteBommelDialog({ open, node, deleting, onConfirm, onCancel }: DeleteBommelDialogProps) {
    const { t } = useTranslation();
    const descendants = descendantsOf(node);

    return (
        <ConfirmDialog
            open={open}
            onOpenChange={(next) => !next && onCancel()}
            title={t('bommel.deleteDialog.title', { name: node.name })}
            description={t('bommel.deleteDialog.description')}
            confirmLabel={t('bommel.deleteDialog.confirm')}
            onConfirm={onConfirm}
            destructive
            loading={deleting}
        >
            {/* Mounted only while open: every card has a dialog, the counts should load for the one being deleted.
                The delete button prefetches them, so they are usually there when the dialog opens. */}
            {open && <Consequences node={node} descendants={descendants} />}
        </ConfirmDialog>
    );
}

function Consequences({ node, descendants }: { node: TreeNodeData; descendants: TreeNodeData[] }) {
    const { t } = useTranslation();
    // Every transaction and receipt on these Bommel, drafts included
    const { loading, transactionCount, confirmedTransactionCount, receiptCount, confirmedReceiptCount } = useDeleteImpact(node);

    const reopened = [
        confirmedTransactionCount > 0 ? t('bommel.deleteDialog.reopenedTransactions', { count: confirmedTransactionCount }) : '',
        confirmedReceiptCount > 0 ? t('bommel.deleteDialog.reopenedReceipts', { count: confirmedReceiptCount }) : '',
    ]
        .filter(Boolean)
        .join(' ');

    const names = descendants.slice(0, MAX_NAMES).map((d) => d.name);
    const nameList =
        descendants.length > MAX_NAMES
            ? `${names.join(', ')} ${t('bommel.deleteDialog.andMore', { count: descendants.length - MAX_NAMES })}`
            : names.join(', ');

    let kept: ReactNode;
    if (loading)
        // Placeholder in the shape of the sentence, so the dialog does not jump when the counts arrive
        kept = (
            <span className="flex flex-col gap-1.5 pt-0.5" aria-hidden="true">
                <Skeleton className="h-3.5 w-full" />
                <Skeleton className="h-3.5 w-2/3" />
            </span>
        );
    else if (transactionCount + receiptCount === 0) kept = t('bommel.deleteDialog.nothingAttached');
    else
        kept = t('bommel.deleteDialog.kept', {
            transactions: t('bommel.deleteDialog.transactions', { count: transactionCount }),
            receipts: t('bommel.deleteDialog.receipts', { count: receiptCount }),
        });

    return (
        <ul className="mt-4 space-y-2.5 rounded-[12px] bg-[var(--surface-sunken)] px-3.5 py-3 text-[13.5px] leading-snug text-foreground">
            {descendants.length > 0 && (
                <li className="flex gap-2.5">
                    <NetworkIcon size={16} className="mt-px flex-shrink-0 text-[var(--negative)]" />
                    <span>{t('bommel.deleteDialog.subBommels', { count: descendants.length, names: nameList })}</span>
                </li>
            )}
            <li className="flex gap-2.5">
                <ShieldCheck size={16} className="mt-px flex-shrink-0 text-[var(--positive)]" aria-hidden="true" />
                <span className="min-w-0 flex-1">{kept}</span>
            </li>
            {!loading && reopened && (
                <li className="flex gap-2.5">
                    <RotateCcw size={16} className="mt-px flex-shrink-0 text-[var(--warning)]" aria-hidden="true" />
                    <span>{reopened}</span>
                </li>
            )}
        </ul>
    );
}

export default DeleteBommelDialog;
