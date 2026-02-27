import { ExclamationTriangleIcon } from '@radix-ui/react-icons';
import { ChevronRight, FileText, Trash2 } from 'lucide-react';
import { FC, memo, useCallback, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { formatAmount, amountColorClass } from '@/components/Receipts/helpers/receiptHelpers';
import { Receipt } from '@/components/Receipts/types';
import Emoji from '@/components/ui/Emoji';
import { cn } from '@/lib/utils';

type ReceiptRowProps = {
    receipt: Receipt;
    isExpanded: boolean;
    onToggle?: (id: string) => void;
    onDelete?: (id: string) => void;
};

const statusStyles: Record<Receipt['status'], string> = {
    paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    unpaid: 'bg-amber-50 text-amber-700 border-amber-200',
    draft: 'bg-gray-100 text-gray-600 border-[#A7A7A7]',
    failed: 'bg-red-50 text-red-700 border-red-200',
};

const ReceiptRow: FC<ReceiptRowProps> = memo(({ receipt, isExpanded, onToggle, onDelete }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const expandRef = useRef<HTMLDivElement>(null);

    const isDraft = receipt.status === 'draft';
    const isFailed = receipt.status === 'failed';
    const isUnassigned = !receipt.project;

    const handleRowClick = useCallback(() => {
        navigate(`/receipts/${receipt.id}`);
    }, [navigate, receipt.id]);

    const handleToggle = useCallback(
        (e: React.MouseEvent) => {
            e.stopPropagation();
            onToggle?.(receipt.id);
        },
        [onToggle, receipt.id]
    );

    const handleToggleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                onToggle?.(receipt.id);
            }
        },
        [onToggle, receipt.id]
    );

    const handleDelete = useCallback(
        (e: React.MouseEvent) => {
            e.stopPropagation();
            if (onDelete) {
                onDelete(receipt.id);
            }
        },
        [onDelete, receipt.id]
    );

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleRowClick();
            }
        },
        [handleRowClick]
    );

    // Animate expand/collapse via max-height
    useEffect(() => {
        const el = expandRef.current;
        if (!el) return;
        if (isExpanded) {
            el.style.maxHeight = el.scrollHeight + 'px';
        } else {
            el.style.maxHeight = '0px';
        }
    }, [isExpanded]);

    return (
        <div
            className={cn(
                'group rounded-2xl border bg-white shadow-sm transition-all duration-200 overflow-hidden',
                isExpanded
                    ? 'border-[var(--purple-300)] border-l-[3px] border-l-[var(--purple-500)]'
                    : 'border-[#E0E0E0] hover:border-primary hover:ring-primary',
                isFailed && !isExpanded && 'bg-red-50/50',
                isUnassigned && !isFailed && !isDraft && !isExpanded && 'border-l-[3px] border-l-amber-400'
            )}
        >
            {/* Desktop Row */}
            <div
                role="button"
                tabIndex={0}
                onClick={handleRowClick}
                onKeyDown={handleKeyDown}
                className={cn(
                    'hidden md:grid grid-cols-[24px_1.5fr_1fr_1fr_1fr_100px_100px_48px] gap-1 items-center',
                    'px-5 py-3.5 cursor-pointer',
                    'hover:bg-[var(--background-tertiary)] transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--purple-500)] focus-visible:ring-inset'
                )}
            >
                {/* Chevron Toggle */}
                <button
                    type="button"
                    onClick={handleToggle}
                    onKeyDown={handleToggleKeyDown}
                    className="inline-flex items-center justify-center w-5 h-5 rounded-md text-[var(--grey-700)] hover:text-[var(--purple-600)] hover:bg-[var(--purple-100)] transition-all"
                    aria-label={isExpanded ? t('common.collapse') : t('common.expand')}
                    aria-expanded={isExpanded}
                >
                    <ChevronRight className={cn('w-4 h-4 transition-transform duration-200', isExpanded && 'rotate-90')} />
                </button>

                {/* Issuer */}
                <div className="flex items-center gap-2 min-w-0">
                    <span className="font-medium text-sm truncate">{receipt.issuer}</span>
                    {receipt.documentId && <FileText className="w-4 h-4 shrink-0 text-[var(--purple-500)]" aria-label={t('receipts.documentLinked')} />}
                </div>

                {/* Date */}
                <span className="text-sm font-medium text-center">{receipt.date}</span>

                {/* Bommel */}
                <span className={cn('flex items-center justify-center gap-1 text-sm font-medium truncate', isUnassigned ? 'text-amber-600 italic' : '')}>
                    {receipt.project ? (
                        <>
                            {receipt.bommelEmoji && <Emoji emoji={receipt.bommelEmoji} className="text-base" />}
                            {receipt.project}
                        </>
                    ) : (
                        t('receipts.unassigned')
                    )}
                </span>

                {/* Category */}
                <span className="text-sm font-medium truncate text-center">{receipt.category}</span>

                {/* Status Badge */}
                <div className="flex justify-center">
                    <span
                        className={cn(
                            'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap',
                            statusStyles[receipt.status]
                        )}
                    >
                        {isFailed && <ExclamationTriangleIcon className="w-3 h-3" />}
                        {t(`receipts.statusBadge.${receipt.status}`)}
                    </span>
                </div>

                {/* Amount */}
                <span className={cn('text-sm font-semibold tabular-nums text-right', amountColorClass(receipt.amount))}>{formatAmount(receipt.amount)}</span>

                {/* Actions */}
                <div className="flex justify-end" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                    {onDelete && (
                        <button
                            type="button"
                            onClick={handleDelete}
                            className="rounded-lg text-gray-400 opacity-0 group-hover:opacity-100 hover:text-red-600 hover:bg-red-50 transition-all"
                            aria-label={t('receipts.deleteDialog.title')}
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Mobile Card */}
            <div
                role="button"
                tabIndex={0}
                onClick={handleRowClick}
                onKeyDown={handleKeyDown}
                className="md:hidden p-4 cursor-pointer hover:bg-[var(--background-tertiary)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--purple-500)] focus-visible:ring-inset"
            >
                <div className="flex items-start justify-between gap-3">
                    {/* Mobile Chevron */}
                    <button
                        type="button"
                        onClick={handleToggle}
                        onKeyDown={handleToggleKeyDown}
                        className="inline-flex items-center justify-center w-5 h-5 mt-0.5 shrink-0 rounded-md text-[var(--grey-700)] hover:text-[var(--purple-600)] hover:bg-[var(--purple-100)] transition-all"
                        aria-label={isExpanded ? t('common.collapse') : t('common.expand')}
                        aria-expanded={isExpanded}
                    >
                        <ChevronRight className={cn('w-4 h-4 transition-transform duration-200', isExpanded && 'rotate-90')} />
                    </button>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                            <span className="font-medium text-sm truncate">{receipt.issuer}</span>
                            {receipt.documentId && <FileText className="w-4 h-4 shrink-0 text-[var(--purple-500)]" />}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs font-medium">{receipt.date}</span>
                            <span className="text-xs text-[var(--grey-400)]">&middot;</span>
                            <span className={cn('flex items-center gap-1 text-xs font-medium truncate', isUnassigned ? 'text-amber-600 italic' : '')}>
                                {receipt.project ? (
                                    <>
                                        {receipt.bommelEmoji && <Emoji emoji={receipt.bommelEmoji} className="text-base" />}
                                        {receipt.project}
                                    </>
                                ) : (
                                    t('receipts.unassigned')
                                )}
                            </span>
                        </div>
                        {receipt.category && <span className="text-xs font-medium mt-0.5 block">{receipt.category}</span>}
                    </div>
                    <div className="text-right shrink-0">
                        <span className={cn('text-sm font-semibold tabular-nums', amountColorClass(receipt.amount))}>{formatAmount(receipt.amount)}</span>
                        <div className="mt-1">
                            <span
                                className={cn(
                                    'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium',
                                    statusStyles[receipt.status]
                                )}
                            >
                                {t(`receipts.statusBadge.${receipt.status}`)}
                            </span>
                        </div>
                    </div>
                </div>
                {onDelete && (
                    <div className="flex justify-end mt-2" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                        <button
                            type="button"
                            onClick={handleDelete}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all"
                            aria-label={t('receipts.deleteDialog.title')}
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    </div>
                )}
            </div>

            {/* Expanded Details — animated */}
            <div ref={expandRef} className="overflow-hidden transition-[max-height] duration-200 ease-in-out" style={{ maxHeight: 0 }}>
                {/* Divider */}
                <div className="mx-5 border-t border-[var(--purple-200)]" />

                <div className="px-5 pb-4 pt-3">
                    <div className="rounded-[10px] bg-white p-2 space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                            {receipt.reference && (
                                <div>
                                    <span className="text-xs font-medium text-[var(--grey-700)] uppercase tracking-wider">{t('receipts.table.reference')}</span>
                                    <p className="mt-0.5 text-sm">{receipt.reference}</p>
                                </div>
                            )}
                            {receipt.purpose && (
                                <div>
                                    <span className="text-xs font-medium text-[var(--grey-700)] uppercase tracking-wider">{t('receipts.table.purpose')}</span>
                                    <p className="mt-0.5 text-sm">{receipt.purpose}</p>
                                </div>
                            )}
                            {receipt.dueDate && (
                                <div>
                                    <span className="text-xs font-medium text-[var(--grey-700)] uppercase tracking-wider">{t('receipts.dueDate')}</span>
                                    <p className="mt-0.5 text-sm">{receipt.dueDate}</p>
                                </div>
                            )}
                        </div>

                        {(receipt.area || receipt.tags.length > 0) && (
                            <div className="flex flex-wrap items-center gap-2 pt-1">
                                {receipt.area && (
                                    <span className="bg-blue-50 text-blue-700 border border-blue-200 text-xs font-medium px-2.5 py-0.5 rounded-full">
                                        {t(`receipts.areas.${receipt.area.toLowerCase()}`)}
                                    </span>
                                )}
                                {receipt.tags.map((tag) => (
                                    <span
                                        key={tag}
                                        className="bg-[var(--purple-100)] text-[var(--purple-900)] border border-[var(--purple-200)] text-xs font-medium px-2.5 py-0.5 rounded-full"
                                    >
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
});

export default ReceiptRow;
