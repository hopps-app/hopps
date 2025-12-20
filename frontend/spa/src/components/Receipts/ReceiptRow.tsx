import { FC, memo } from 'react';
import { ChevronDownIcon, ChevronRightIcon, InfoCircledIcon, ExclamationTriangleIcon } from '@radix-ui/react-icons';
import { useTranslation } from 'react-i18next';

import { Checkbox } from '@/components/ui/shadecn/Checkbox';
import { cn } from '@/lib/utils';
import { Receipt } from '@/components/Receipts/types';
import { getStatusTranslationKey, formatAmount, amountColorClass } from '@/components/Receipts/helpers/receiptHelpers';

function stopEventPropagationHandlers<T extends HTMLElement>() {
    return {
        onClick: (e: React.MouseEvent<T>) => e.stopPropagation(),
        onMouseDown: (e: React.MouseEvent<T>) => e.stopPropagation(),
    };
}

type ReceiptRowProps = {
    receipt: Receipt;
    isExpanded: boolean;
    isChecked: boolean;
    onToggle: (id: string) => void;
    onCheckChange: (id: string, value: boolean) => void;
};

const ReceiptRow: FC<ReceiptRowProps> = memo(({ receipt, isExpanded, isChecked, onToggle, onCheckChange }) => {
    const { t } = useTranslation();

    const isDraft = receipt.status === 'draft';
    const isFailed = receipt.status === 'failed';

    return (
        <li
            className={cn(
                'rounded-[var(--radius-l)] p-2 space-y-2',
                'bg-[var(--background-secondary)]',
                isDraft && 'bg-grey-500',
                isFailed && 'bg-[var(--error-100)]'
            )}
        >
            <button
                type="button"
                onClick={() => onToggle(receipt.id)}
                aria-expanded={isExpanded}
                className={cn(
                    'grid w-full grid-cols-6 items-center cursor-pointer',
                    'rounded-[var(--radius)] py-1 pr-4 transition',
                    'focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-transparent'
                )}
            >
                <div className="flex items-center min-w-0 pr-2">
                    {isDraft && (
                        <div className="flex items-center gap-1 mr-2 text-xs text-muted-foreground shrink-0">
                            <InfoCircledIcon className="w-4 h-4" />
                            <span>{t('receipts.draft')}</span>
                        </div>
                    )}

                    <div className="flex items-center gap-2 min-w-0">
                        {isExpanded ? <ChevronDownIcon className="w-5 h-5 shrink-0" /> : <ChevronRightIcon className="w-5 h-5 shrink-0" />}
                        <span className="font-medium truncate">{receipt.issuer}</span>
                    </div>
                </div>

                <span className="font-medium text-start">{receipt.date}</span>
                <span className="font-medium text-start">{receipt.project}</span>
                <span className="font-medium text-start">{receipt.category}</span>

                <span className="font-light text-sm text-right flex items-center justify-end gap-1">
                    {isFailed && (
                        <>
                            <ExclamationTriangleIcon className="w-4 h-4 shrink-0 text-red-700" />
                            <span className="text-red-700">{t(getStatusTranslationKey('failed'))}</span>
                        </>
                    )}
                </span>

                <div className="flex items-center justify-end gap-8">
                    <span className={cn('text-base font-semibold tabular-nums text-right', amountColorClass(receipt.amount))}>
                        {formatAmount(receipt.amount)}
                    </span>

                    <div className="shrink-0" {...stopEventPropagationHandlers<HTMLDivElement>()}>
                        <Checkbox checked={isChecked} onCheckedChange={(v) => onCheckChange(receipt.id, Boolean(v))} />
                    </div>
                </div>
            </button>

            {isExpanded && (
                <div className="pb-2 pt-3 pl-7 pr-16 space-y-6">
                    <div className="grid grid-cols-4 gap-4 items-start">
                        <span className="text-[--grey-900] text-sm font-medium">{receipt.reference}</span>
                        <span className="text-[--grey-900] text-sm font-medium">{receipt.purpose}</span>
                        <span className="text-[--grey-900] text-sm font-medium">
                            {t('receipts.dueDate')}: {receipt.dueDate}
                        </span>
                        <span className="text-[--grey-900] text-sm font-medium text-right">{t(getStatusTranslationKey(receipt.status))}</span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {receipt.tags.map((tag) => (
                            <span key={tag} className="bg-[var(--purple-100)] text-[var(--purple-900)] text-xs font-medium px-3 py-1 rounded-[var(--radius-l)]">
                                {tag}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </li>
    );
});

export default ReceiptRow;
