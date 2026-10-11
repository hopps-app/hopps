import type { CategoryGroupResponse, DocumentResponse, TransactionResponse } from '@hopps/api-client';
import { Check, ChevronRight, FileText, Folder, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { BommelTreeNodeModel } from '@/components/BommelTreeView/BommelTreeNodeModel';
import { Eyebrow } from '@/components/Transactions/Eyebrow';
import { fmtCurrency, fmtDate } from '@/components/Transactions/format';
import { Badge, STATUS_STYLE } from '@/components/Transactions/StatusBadge';
import { StatusIcon, type StatusIconKind } from '@/components/Transactions/StatusIcon';
import { TxIcon } from '@/components/Transactions/TxIcon';
import Emoji from '@/components/ui/Emoji';
import { ListIcon, ReceiptIcon, TagIcon } from '@/components/ui/icons/lineIcons';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/shadecn/Tooltip';
import { useApplicableCategoryGroups, useCategoryGroupValues } from '@/hooks/queries/useCategoryGroups';
import { useDocuments } from '@/hooks/queries/useDocuments';
import { useTransactionAggregate, useTransactions } from '@/hooks/queries/useTransactions';
import { getTransactionDisplayStatus, OPEN_TRANSACTION_STATUSES, type TransactionDisplayStatus } from '@/lib/transactionStatus';
import { cn } from '@/lib/utils';

const MAX_ROWS = 3;
/** Values listed in a category group's tooltip before "+N weitere" */
const MAX_VALUES = 12;

const EYEBROW = 'text-[11px] font-extrabold uppercase tracking-[0.04em] text-[var(--ink-faint)]';

interface BommelDetailsPanelProps {
    node: BommelTreeNodeModel;
    /** The selected Bommel first, then its sub-Bommel when amounts include them */
    scopeIds: number[];
    /** Amounts and lists include the sub-Bommel */
    includesSubBommel: boolean;
    bommelNames: Map<number, string>;
    /** Example data: no API, so only the amounts are shown */
    demo: boolean;
    onClose: () => void;
    onOpenTransaction: (id: number) => void;
    onOpenReceipt: (doc: DocumentResponse) => void;
    /** Open the Transaktionen page filtered to this Bommel scope and the given statuses */
    onShowTransactions: (statuses: TransactionDisplayStatus[]) => void;
    onShowAllReceipts: () => void;
}

/**
 * Details of the selected Bommel next to the tree (a bottom sheet on small screens): its amounts, the category groups
 * that apply to it, and the transactions and receipts that still need attention.
 */
export function BommelDetailsPanel({
    node,
    scopeIds,
    includesSubBommel,
    bommelNames,
    demo,
    onClose,
    onOpenTransaction,
    onOpenReceipt,
    onShowTransactions,
    onShowAllReceipts,
}: BommelDetailsPanelProps) {
    const { t } = useTranslation();
    const income = Math.abs(node.data?.income ?? 0);
    const expenses = Math.abs(node.data?.expenses ?? 0);
    const total = node.data?.total ?? 0;
    const emoji = node.data?.emoji;

    return (
        <aside
            aria-label={node.text}
            className={cn(
                'font-hanken z-40 flex flex-col overflow-hidden border border-border-soft bg-background-secondary',
                // Small screens: bottom sheet over the page. Large screens: a column next to the tree, as tall as the canvas.
                'fixed inset-x-0 bottom-0 max-h-[75dvh] rounded-t-[18px] shadow-[var(--shadow-lg)]',
                'lg:static lg:max-h-full lg:rounded-[18px] lg:shadow-[var(--shadow-sm)]'
            )}
        >
            <header className="flex flex-shrink-0 items-center gap-[11px] border-b border-border-soft px-[22px] py-[18px]">
                {emoji ? (
                    <span className="w-9 flex-shrink-0 text-center text-[30px] leading-none">
                        <Emoji emoji={emoji} />
                    </span>
                ) : (
                    <span className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-[11px] bg-[var(--accent-surface)] text-purple-600">
                        <Folder className="h-5 w-5" aria-hidden="true" />
                    </span>
                )}
                <h2 className="min-w-0 flex-1 truncate text-[17px] font-extrabold tracking-[-0.02em] text-foreground">{node.text}</h2>
                <button
                    type="button"
                    onClick={onClose}
                    aria-label={t('common.close')}
                    title={t('common.close')}
                    className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-[var(--surface-sunken)] hover:text-foreground"
                >
                    <X className="h-[17px] w-[17px]" aria-hidden="true" />
                </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-[22px] pb-[26px] pt-5">
                <div className="mb-[14px] flex gap-3">
                    <div className="flex-1">
                        <div className={EYEBROW}>{t('bommel.details.income')}</div>
                        <div className="text-[17px] font-extrabold tabular-nums text-[var(--positive)]">+{fmtCurrency(income)}</div>
                    </div>
                    <div className="flex-1">
                        <div className={EYEBROW}>{t('bommel.details.expenses')}</div>
                        <div className="text-[17px] font-extrabold tabular-nums text-[var(--negative)]">−{fmtCurrency(expenses)}</div>
                    </div>
                </div>

                <div className="mb-[14px] rounded-[12px] bg-[var(--surface-sunken)] px-[13px] py-[11px]">
                    <div className={EYEBROW}>
                        {t('bommel.details.total')} {includesSubBommel && t('bommel.panel.totalWithSub')}
                    </div>
                    <div
                        className={cn(
                            'text-[24px] font-extrabold tracking-[-0.02em] tabular-nums',
                            total >= 0 ? 'text-[var(--positive)]' : 'text-[var(--negative)]'
                        )}
                    >
                        {total >= 0 ? '+' : '−'}
                        {fmtCurrency(Math.abs(total))}
                    </div>
                </div>

                {!demo && (
                    <OpenItems
                        bommelId={Number(node.id)}
                        scopeIds={scopeIds}
                        bommelNames={bommelNames}
                        onOpenTransaction={onOpenTransaction}
                        onOpenReceipt={onOpenReceipt}
                        onShowTransactions={onShowTransactions}
                        onShowAllReceipts={onShowAllReceipts}
                    />
                )}
            </div>
        </aside>
    );
}

type OpenItemsProps = Pick<
    BommelDetailsPanelProps,
    'scopeIds' | 'bommelNames' | 'onOpenTransaction' | 'onOpenReceipt' | 'onShowTransactions' | 'onShowAllReceipts'
> & { bommelId: number };

/** Category groups and the open transactions and receipts. Only mounted for real data, so the example never calls the API. */
function OpenItems({ bommelId, scopeIds, bommelNames, onOpenTransaction, onOpenReceipt, onShowTransactions, onShowAllReceipts }: OpenItemsProps) {
    const { t } = useTranslation();
    const { data: groups } = useApplicableCategoryGroups(bommelId);

    const transactions = useTransactions({
        bommelIds: scopeIds,
        displayStatuses: OPEN_TRANSACTION_STATUSES,
        sortBy: 'transactionTime',
        sortDir: 'desc',
        size: MAX_ROWS,
    });
    // One count per open status for the footer breakdown; together they are the section's total
    const draftCount = useTransactionAggregate({ bommelIds: scopeIds, displayStatuses: ['DRAFT'] }).data?.count ?? 0;
    const partialCount = useTransactionAggregate({ bommelIds: scopeIds, displayStatuses: ['PARTIAL'] }).data?.count ?? 0;
    const linkedCount = useTransactionAggregate({ bommelIds: scopeIds, displayStatuses: ['LINKED'] }).data?.count ?? 0;
    const statusCounts: { status: TransactionDisplayStatus; count: number }[] = [
        { status: 'DRAFT', count: draftCount },
        { status: 'PARTIAL', count: partialCount },
        { status: 'LINKED', count: linkedCount },
    ];
    const txCount = draftCount + partialCount + linkedCount || (transactions.data?.length ?? 0);

    // The documents API has no status filter or paging; the Belege page loads them all as well, so this shares its cache
    const documents = useDocuments();
    const scope = new Set(scopeIds);
    const openReceipts = ((documents.data ?? []) as DocumentResponse[])
        .filter((doc) => doc.bommelId != null && scope.has(doc.bommelId) && doc.documentStatus !== 'CONFIRMED')
        .sort((a, b) => receiptTime(b) - receiptTime(a));

    // Items booked on a sub-Bommel name it, items on the selected Bommel itself do not
    const subName = (id: number | undefined) => (id != null && id !== bommelId ? bommelNames.get(id) : undefined);

    // Tooltip on a section's count: which of the open items the list shows (the latest MAX_ROWS of them)
    const countHint = (key: string, count: number) => (count > MAX_ROWS ? t(`${key}Partial`, { shown: MAX_ROWS, count }) : t(key, { count }));

    const statusLabel = (status: TransactionDisplayStatus, count: number) =>
        t(status === 'DRAFT' && count !== 1 ? 'transactions.status.drafts' : STATUS_STYLE[status].labelKey);

    return (
        <>
            <section className="mb-[18px] border-t border-border-soft pt-4">
                <Eyebrow icon={<TagIcon size={14} />} className="mb-[11px]">
                    {t('bommel.panel.categories')}
                </Eyebrow>
                <div className="flex flex-wrap gap-1.5">
                    {groups && groups.length > 0 ? (
                        groups.map((group) => <CategoryGroupBadge key={group.id} group={group} />)
                    ) : (
                        <span className="text-[12.5px] font-semibold text-muted-foreground">{groups ? t('bommel.panel.noCategories') : '…'}</span>
                    )}
                </div>
            </section>

            <Section
                icon={<ListIcon size={14} />}
                title={t('bommel.panel.transactions')}
                loading={transactions.isLoading}
                error={transactions.isError}
                count={txCount}
                countHint={countHint('bommel.panel.openTransactionsHint', txCount)}
                emptyText={t('bommel.panel.allConfirmed')}
                footer={
                    <div className="flex items-center gap-2 border-t border-border-soft bg-[var(--surface-sunken)] py-1.5 pl-2 pr-1.5">
                        {/* One status icon and count per open status; the status name is in the tooltip. Each opens that status. */}
                        <div className="flex min-w-0 flex-1 items-center">
                            {statusCounts
                                .filter(({ count }) => count > 0)
                                .map(({ status, count }) => (
                                    <HoverLabel key={status} label={`${count} ${statusLabel(status, count)}`}>
                                        <button
                                            type="button"
                                            onClick={() => onShowTransactions([status])}
                                            aria-label={`${count} ${statusLabel(status, count)}`}
                                            className="inline-flex items-center gap-[5px] rounded-md px-1.5 py-1 text-[12px] font-bold tabular-nums text-muted-foreground transition-colors hover:bg-[var(--background-secondary)] hover:text-foreground"
                                        >
                                            <StatusIcon kind={status} />
                                            {count}
                                        </button>
                                    </HoverLabel>
                                ))}
                        </div>
                        <button
                            type="button"
                            onClick={() => onShowTransactions(OPEN_TRANSACTION_STATUSES)}
                            className="inline-flex flex-shrink-0 items-center gap-1 rounded-md px-1.5 py-1 text-[12.5px] font-bold text-purple-600 transition-colors hover:bg-[var(--background-secondary)] hover:text-purple-700"
                        >
                            {txCount > MAX_ROWS ? t('bommel.panel.showAllCount', { count: txCount }) : t('bommel.panel.showAll')}
                            <ChevronRight className="h-4 w-4" aria-hidden="true" />
                        </button>
                    </div>
                }
            >
                {(transactions.data ?? []).map((tx: TransactionResponse) => {
                    const status = getTransactionDisplayStatus(tx);
                    const amount = Number(tx.total ?? 0);
                    return (
                        <Row
                            key={tx.id}
                            onClick={() => tx.id != null && onOpenTransaction(tx.id)}
                            tile={<TxIcon size={30} incoming={amount >= 0} />}
                            status={<StatusMark kind={status} label={t(STATUS_STYLE[status].labelKey)} />}
                            title={tx.name || tx.senderName || ''}
                            marker={
                                tx.documentId ? (
                                    <FileText size={12} className="flex-shrink-0 text-purple-700" aria-label={t('bommel.panel.hasReceipt')} />
                                ) : undefined
                            }
                            meta={meta(tx.transactionTime ?? tx.createdAt, subName(tx.bommelId))}
                            amount={
                                <span className={cn('text-[13px] font-bold', amount >= 0 ? 'text-[var(--positive)]' : 'text-[var(--negative)]')}>
                                    {amount >= 0 ? '+ ' : '− '}
                                    {fmtCurrency(Math.abs(amount))}
                                </span>
                            }
                        />
                    );
                })}
            </Section>

            <Section
                icon={<ReceiptIcon size={14} />}
                title={t('bommel.panel.receipts')}
                loading={documents.isLoading}
                error={documents.isError}
                count={openReceipts.length}
                countHint={countHint('bommel.panel.openReceiptsHint', openReceipts.length)}
                emptyText={t('bommel.panel.noUnreviewed')}
                footer={
                    <button
                        type="button"
                        onClick={onShowAllReceipts}
                        className="flex w-full items-center justify-between gap-2 border-t border-border-soft bg-[var(--surface-sunken)] px-[13px] py-[9px] text-left text-[12.5px] font-bold text-purple-600 transition-colors hover:text-purple-700"
                    >
                        <span>{t('bommel.panel.openInReceipts')}</span>
                        <ChevronRight className="h-4 w-4" aria-hidden="true" />
                    </button>
                }
            >
                {openReceipts.slice(0, MAX_ROWS).map((doc) => (
                    <Row
                        key={doc.id}
                        onClick={() => onOpenReceipt(doc)}
                        tile={
                            <span className="grid h-[30px] w-[30px] place-items-center rounded-[10px] bg-[var(--accent-surface)] text-purple-700">
                                <ReceiptIcon size={16} />
                            </span>
                        }
                        status={<StatusMark kind="UNREVIEWED" label={t('receipts.filter.unreviewed')} />}
                        title={doc.senderName || doc.name || doc.fileName || ''}
                        meta={meta(doc.transactionTime ?? doc.createdAt, subName(doc.bommelId))}
                        amount={<span className="text-[13px] font-extrabold text-foreground">{fmtCurrency(Math.abs(Number(doc.total ?? 0)))}</span>}
                    />
                ))}
            </Section>
        </>
    );
}

const receiptTime = (doc: DocumentResponse) => new Date(doc.transactionTime ?? doc.createdAt ?? 0).getTime();

const meta = (date: Date | undefined, subBommelName: string | undefined) => (subBommelName ? `${fmtDate(date)} · ${subBommelName}` : fmtDate(date));

interface SectionProps {
    icon: ReactNode;
    title: string;
    loading: boolean;
    error: boolean;
    /** Total number of open items (shown next to the heading); the list shows at most MAX_ROWS of them */
    count: number;
    /** Tooltip on the count, saying what it counts */
    countHint: string;
    emptyText: string;
    /** Bottom bar of the list, leading to the full list page */
    footer: ReactNode;
    children: ReactNode;
}

/** A titled list of up to three open items with a footer bar, or an empty state */
function Section({ icon, title, loading, error, count, countHint, emptyText, footer, children }: SectionProps) {
    const { t } = useTranslation();
    let body: ReactNode;
    if (loading) {
        body = <div className="h-[116px] animate-pulse rounded-[14px] bg-[var(--surface-sunken)]" />;
    } else if (error) {
        body = (
            <div className="rounded-[14px] bg-[var(--surface-sunken)] px-[13px] py-2.5 text-[12.5px] font-semibold text-muted-foreground">
                {t('bommel.panel.loadError')}
            </div>
        );
    } else if (count === 0) {
        body = (
            <div className="flex items-center gap-2 rounded-[14px] bg-[var(--surface-sunken)] px-[13px] py-2.5 text-[12.5px] font-semibold text-muted-foreground">
                <Check className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
                {emptyText}
            </div>
        );
    } else {
        body = (
            <div className="overflow-hidden rounded-[14px] border border-border-soft">
                <div className="divide-y divide-border-soft">{children}</div>
                {footer}
            </div>
        );
    }

    return (
        <section className="mb-[18px]">
            <div className="mb-[11px] flex items-center justify-between gap-2">
                <Eyebrow icon={icon}>{title}</Eyebrow>
                {!loading && count > 0 && (
                    <HoverLabel label={countHint}>
                        <span
                            tabIndex={0}
                            aria-label={countHint}
                            // Same neutral count bubble as the status filters on the Transaktionen and Belege pages
                            className="grid h-5 min-w-5 cursor-help place-items-center rounded-full bg-[color-mix(in_oklch,var(--surface-track)_60%,var(--background-secondary))] px-[5px] text-[11.5px] font-extrabold tabular-nums text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                            {count}
                        </span>
                    </HoverLabel>
                )}
            </div>
            {body}
        </section>
    );
}

interface RowProps {
    /** Icon tile on the left */
    tile: ReactNode;
    /** Status mark, shown on the tile's corner */
    status: ReactNode;
    title: string;
    /** Optional small icon after the title, e.g. "has a receipt" */
    marker?: ReactNode;
    meta: string;
    amount: ReactNode;
    onClick: () => void;
}

function Row({ tile, status, title, marker, meta: metaText, amount, onClick }: RowProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="group flex w-full items-center gap-2.5 py-2.5 pl-[11px] pr-2 text-left transition-colors hover:bg-[var(--surface-sunken)]"
        >
            <span className="relative flex-shrink-0">
                {tile}
                <span className="absolute -bottom-[3px] -right-[3px] flex rounded-full bg-[var(--background-secondary)] p-[1.5px] transition-colors group-hover:bg-[var(--surface-sunken)]">
                    {status}
                </span>
            </span>
            <span className="min-w-0 flex-1">
                <span className="flex min-w-0 items-center gap-1">
                    <span className="truncate text-[13px] font-bold text-foreground">{title}</span>
                    {marker}
                </span>
                <span className="block truncate text-[11.5px] font-semibold text-muted-foreground">{metaText}</span>
            </span>
            <span className="whitespace-nowrap tabular-nums">{amount}</span>
            <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />
        </button>
    );
}

/** A category group as a badge; hovering or focusing it lists the group's values, loaded on first open */
function CategoryGroupBadge({ group }: { group: CategoryGroupResponse }) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const [requested, setRequested] = useState(false);
    // A group known to have no values needs no request
    const empty = group.valueCount === 0;
    const { data, isLoading } = useCategoryGroupValues(group.id, '', requested && !empty);
    const shown = (data?.items ?? []).slice(0, MAX_VALUES);
    const total = group.valueCount ?? data?.total ?? shown.length;

    let content: ReactNode;
    if (empty || (data && shown.length === 0)) content = t('bommel.panel.noValues');
    else if (isLoading || !data) content = '…';
    else
        content = (
            <>
                {shown.map((v) => v.value).join(', ')}
                {total > shown.length && <span className="opacity-70"> {t('bommel.panel.moreValues', { count: total - shown.length })}</span>}
            </>
        );

    return (
        <TooltipProvider delayDuration={100}>
            <Tooltip
                open={open}
                onOpenChange={(next) => {
                    setOpen(next);
                    if (next) setRequested(true);
                }}
            >
                <TooltipTrigger asChild>
                    <button type="button" className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                        <Badge>{group.name}</Badge>
                    </button>
                </TooltipTrigger>
                <TooltipContent
                    side="top"
                    align="start"
                    className="z-[120] max-w-[280px] rounded-[10px] bg-[#1B1B1F] px-3.5 py-2.5 text-[12.5px] font-medium leading-snug text-white"
                >
                    {content}
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

/** Short label in the dark tooltip on hover or focus */
function HoverLabel({ label, children }: { label: string; children: ReactNode }) {
    return (
        <TooltipProvider delayDuration={100}>
            <Tooltip>
                <TooltipTrigger asChild>{children}</TooltipTrigger>
                <TooltipContent
                    side="top"
                    align="end"
                    className="z-[120] max-w-[240px] rounded-[10px] bg-[#1B1B1F] px-3 py-1.5 text-[12px] font-semibold leading-snug text-white"
                >
                    {label}
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

/** Status icon on a row; the status name shows in a tooltip and is the accessible name */
function StatusMark({ kind, label }: { kind: StatusIconKind; label: string }) {
    return (
        <TooltipProvider delayDuration={100}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <span role="img" aria-label={label} className="flex">
                        <StatusIcon kind={kind} />
                    </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="z-[120] rounded-[10px] bg-[#1B1B1F] px-3 py-1.5 text-[12px] font-semibold text-white">
                    {label}
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

export default BommelDetailsPanel;
