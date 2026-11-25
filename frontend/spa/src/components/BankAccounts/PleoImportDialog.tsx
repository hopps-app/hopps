import { ApiException, type PleoImportResponse, type PleoSkippedFile } from '@hopps/api-client';
import { AlertCircle, CheckCircle, FileArchive, FileText, Loader2, Receipt, Sheet, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Trans, useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import Button from '@/components/ui/Button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { BaseSelect, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/shadecn/BaseSelect';
import { useAttachPleoReceipts, useBankAccount, useImportPleoExport } from '@/hooks/queries/useBankAccounts';
import { useApplicableCategoryGroups } from '@/hooks/queries/useCategoryGroups';
import { buildReceiptBatches, isZipFile, RECEIPT_ACCEPT } from '@/lib/pleoReceipts';
import { cn } from '@/lib/utils';
import { getErrorBody } from '@/utils/errorUtils';

const NO_GROUP = 'none';

type Phase = 'form' | 'running' | 'done';

type Outcome = {
    importResult?: PleoImportResponse;
    linkedReceipts: number;
    linkedFiles: number;
    skipped: PleoSkippedFile[];
    /** Requests that failed as a whole (e.g. too large), by their files. */
    failedFiles: string[];
};

interface PleoImportProps {
    accountId: number;
    onClose: () => void;
    onViewTransactions?: () => void;
}

function formatSize(bytes: number): string {
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Imports Pleo's expense export into a Pleo account, together with the receipt files: each expense becomes a movement
 * with a draft booking that is already linked, gets its receipt by its receipt number and its category from the chosen
 * group. Every booking still has to be confirmed. Receipts alone (without an export) can be added later the same way.
 */
export function PleoImport({ accountId, onClose, onViewTransactions }: PleoImportProps) {
    const { t } = useTranslation();
    const { data: account } = useBankAccount(accountId);
    const { data: groups = [], isLoading: groupsLoading } = useApplicableCategoryGroups(account?.bommelId);
    const importMutation = useImportPleoExport();
    const receiptsMutation = useAttachPleoReceipts();

    const [phase, setPhase] = useState<Phase>('form');
    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [receipts, setReceipts] = useState<File[]>([]);
    // Until the user picks one, the group of the last import is offered again (if it still applies).
    const [groupChoice, setGroupChoice] = useState<string | null>(null);
    const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [outcome, setOutcome] = useState<Outcome | null>(null);

    const lastGroup = account?.categoryGroupId;
    const groupId = groupChoice ?? (lastGroup != null && groups.some((g) => g.id === lastGroup) ? String(lastGroup) : NO_GROUP);

    const csvDrop = useDropzone({
        accept: { 'text/csv': ['.csv'], 'application/vnd.ms-excel': ['.csv'] },
        multiple: false,
        onDrop: (accepted) => {
            if (accepted[0]) setCsvFile(accepted[0]);
            setError(null);
        },
    });

    const receiptDrop = useDropzone({
        accept: RECEIPT_ACCEPT,
        multiple: true,
        onDrop: (accepted) => {
            setReceipts((prev) => {
                const known = new Set(prev.map((f) => `${f.name}:${f.size}`));
                return [...prev, ...accepted.filter((f) => !known.has(`${f.name}:${f.size}`))];
            });
            setError(null);
        },
    });

    const receiptBytes = useMemo(() => receipts.reduce((sum, f) => sum + f.size, 0), [receipts]);
    const canStart = phase === 'form' && (csvFile != null || receipts.length > 0);

    const importErrorMessage = (err: unknown): string => {
        if (ApiException.isApiException(err)) {
            const body = getErrorBody<{ code?: string; accountName?: string; message?: string }>(err);
            if (err.status === 409 && body?.code === 'FILE_ALREADY_IMPORTED') {
                return t('pleoImport.error.alreadyImported', { account: body.accountName ?? '' });
            }
            if (err.status === 400) {
                return t('pleoImport.error.notAPleoExport');
            }
        }
        return t('pleoImport.error.generic');
    };

    const run = async () => {
        if (!canStart) return;
        setPhase('running');
        setError(null);
        const result: Outcome = { linkedReceipts: 0, linkedFiles: 0, skipped: [], failedFiles: [] };

        if (csvFile) {
            setProgress(null);
            try {
                result.importResult = await importMutation.mutateAsync({
                    accountId,
                    file: csvFile,
                    categoryGroupId: groupId === NO_GROUP ? undefined : Number(groupId),
                });
            } catch (err) {
                setError(importErrorMessage(err));
                setPhase('form');
                return;
            }
        }

        const batches = buildReceiptBatches(receipts);
        for (let i = 0; i < batches.length; i++) {
            setProgress({ done: i + 1, total: batches.length });
            try {
                const response = await receiptsMutation.mutateAsync({ accountId, files: batches[i] });
                result.linkedReceipts += response.linked?.length ?? 0;
                result.linkedFiles += (response.linked ?? []).reduce((sum, l) => sum + (l.fileNames?.length ?? 0), 0);
                result.skipped.push(...(response.skipped ?? []));
            } catch {
                result.failedFiles.push(...batches[i].map((f) => f.name));
            }
        }
        setProgress(null);
        setOutcome(result);
        setPhase('done');
    };

    // ── Result ───────────────────────────────────────────────────────────────────
    if (phase === 'done' && outcome) {
        return <PleoImportResult outcome={outcome} onClose={onClose} onViewTransactions={onViewTransactions} />;
    }

    // ── Form / running ───────────────────────────────────────────────────────────
    const running = phase === 'running';
    return (
        <div className={cn('flex flex-col gap-5', running && 'pointer-events-none opacity-60')}>
            <p className="text-sm text-muted-foreground">{t('pleoImport.intro')}</p>

            {/* 1. Export */}
            <section className="grid gap-2">
                <h3 className="text-sm font-bold">{t('pleoImport.csv.title')}</h3>
                <div
                    {...csvDrop.getRootProps()}
                    className={cn(
                        'flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed px-4 py-3 transition-colors',
                        csvDrop.isDragActive ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-primary/40 dark:border-gray-700'
                    )}
                >
                    <input {...csvDrop.getInputProps()} aria-label={t('pleoImport.csv.choose')} />
                    <Sheet className="h-5 w-5 flex-shrink-0 text-primary" />
                    {csvFile ? (
                        <span className="min-w-0 flex-1 truncate text-sm font-semibold">{csvFile.name}</span>
                    ) : (
                        <span className="flex-1 text-sm text-muted-foreground">{t('pleoImport.csv.drop')}</span>
                    )}
                    {csvFile && (
                        <button
                            type="button"
                            className="rounded p-1 text-muted-foreground hover:bg-gray-100 dark:hover:bg-gray-700"
                            aria-label={t('pleoImport.removeFile', { name: csvFile.name })}
                            onClick={(e) => {
                                e.stopPropagation();
                                setCsvFile(null);
                            }}
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>
                <p className="text-xs text-muted-foreground">{t('pleoImport.csv.hint')}</p>
            </section>

            {/* 2. Category group */}
            <section className="grid gap-2">
                <h3 className="text-sm font-bold">{t('pleoImport.group.title')}</h3>
                <BaseSelect value={groupId} onValueChange={(v) => v && setGroupChoice(v)} disabled={groupsLoading}>
                    <SelectTrigger aria-label={t('pleoImport.group.title')}>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value={NO_GROUP}>{t('pleoImport.group.none')}</SelectItem>
                        {groups.map((g) => (
                            <SelectItem key={g.id} value={String(g.id)}>
                                {g.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </BaseSelect>
                <p className="text-xs text-muted-foreground">
                    {groups.length === 0 && !groupsLoading ? (
                        <Trans
                            i18nKey="pleoImport.group.noneAvailable"
                            components={{ link: <Link to="/admin/categories" className="font-semibold text-primary hover:underline" /> }}
                        />
                    ) : (
                        t('pleoImport.group.hint')
                    )}
                </p>
            </section>

            {/* 3. Receipts */}
            <section className="grid gap-2">
                <h3 className="text-sm font-bold">{t('pleoImport.receipts.title')}</h3>
                <div
                    {...receiptDrop.getRootProps()}
                    className={cn(
                        'flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-5 text-center transition-colors',
                        receiptDrop.isDragActive ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-primary/40 dark:border-gray-700'
                    )}
                >
                    <input {...receiptDrop.getInputProps()} aria-label={t('pleoImport.receipts.choose')} />
                    <Receipt className="h-6 w-6 text-primary" />
                    <span className="text-sm font-semibold">{t('pleoImport.receipts.drop')}</span>
                    <span className="text-xs text-muted-foreground">{t('pleoImport.receipts.hint')}</span>
                </div>
                <p className="text-xs text-muted-foreground">{t('pleoImport.receipts.mergeHint')}</p>
                {receipts.length > 0 && (
                    <div className="rounded-xl border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center justify-between px-3 py-2 text-xs font-semibold text-muted-foreground">
                            <span>{t('pleoImport.receipts.selected', { count: receipts.length, size: formatSize(receiptBytes) })}</span>
                            <button type="button" className="hover:text-foreground" onClick={() => setReceipts([])}>
                                {t('pleoImport.receipts.clear')}
                            </button>
                        </div>
                        <ul className="max-h-40 overflow-y-auto border-t border-gray-100 dark:border-gray-700">
                            {receipts.map((f) => (
                                <li key={`${f.name}:${f.size}`} className="flex items-center gap-2 px-3 py-1.5 text-sm">
                                    {isZipFile(f) ? (
                                        <FileArchive className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                                    ) : (
                                        <FileText className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                                    )}
                                    <span className="min-w-0 flex-1 truncate">{f.name}</span>
                                    <span className="text-xs tabular-nums text-muted-foreground">{formatSize(f.size)}</span>
                                    <button
                                        type="button"
                                        className="rounded p-0.5 text-muted-foreground hover:bg-gray-100 dark:hover:bg-gray-700"
                                        aria-label={t('pleoImport.removeFile', { name: f.name })}
                                        onClick={() => setReceipts((prev) => prev.filter((p) => p !== f))}
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </section>

            {error && (
                <div className="flex items-start gap-2 rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
                    <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    {error}
                </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-1">
                {running && (
                    <span className="mr-auto inline-flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {progress ? t('pleoImport.running.receipts', progress) : t('pleoImport.running.export')}
                    </span>
                )}
                <Button variant="outline" onClick={onClose} disabled={running}>
                    {t('common.cancel')}
                </Button>
                <Button onClick={run} disabled={!canStart}>
                    {t('pleoImport.start')}
                </Button>
            </div>
        </div>
    );
}

function PleoImportResult({ outcome, onClose, onViewTransactions }: { outcome: Outcome; onClose: () => void; onViewTransactions?: () => void }) {
    const { t } = useTranslation();
    const r = outcome.importResult;
    const skippedByReason = outcome.skipped.reduce<Record<string, string[]>>((acc, s) => {
        const reason = s.reason ?? 'UNREADABLE';
        acc[reason] = [...(acc[reason] ?? []), s.fileName ?? ''];
        return acc;
    }, {});
    const hasWarnings = (r?.errorRows ?? 0) > 0 || (r?.unknownCategories?.length ?? 0) > 0 || outcome.skipped.length > 0 || outcome.failedFiles.length > 0;

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3 rounded-xl bg-emerald-50 px-4 py-3 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
                <CheckCircle className="h-5 w-5 flex-shrink-0" />
                <p className="text-[13.5px] font-semibold">{t('pleoImport.result.confirmHint')}</p>
            </div>

            {(r || outcome.linkedReceipts > 0) && (
                <ul className="grid gap-1.5 text-sm">
                    {r && (
                        <>
                            <li>{t('pleoImport.result.imported', { count: r.importedRows ?? 0 })}</li>
                            {(r.duplicateRows ?? 0) > 0 && (
                                <li className="text-muted-foreground">{t('pleoImport.result.duplicates', { count: r.duplicateRows })}</li>
                            )}
                            {(r.categorizedRows ?? 0) > 0 && <li>{t('pleoImport.result.categorized', { count: r.categorizedRows })}</li>}
                            {(r.uncategorizedRows ?? 0) > 0 && (
                                <li className="text-muted-foreground">{t('pleoImport.result.uncategorized', { count: r.uncategorizedRows })}</li>
                            )}
                        </>
                    )}
                    {(outcome.linkedReceipts > 0 || outcome.linkedFiles > 0) && (
                        <li>{t('pleoImport.result.receipts', { count: outcome.linkedReceipts, files: outcome.linkedFiles })}</li>
                    )}
                </ul>
            )}

            {hasWarnings && (
                <div className="grid gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                    {(r?.unknownCategories?.length ?? 0) > 0 && (
                        <p>{t('pleoImport.result.unknownCategories', { categories: r!.unknownCategories!.join(', ') })}</p>
                    )}
                    {(r?.errorRows ?? 0) > 0 && (
                        <div>
                            <p className="font-semibold">{t('pleoImport.result.errors', { count: r!.errorRows })}</p>
                            <ul className="mt-1 list-disc pl-5 text-xs">
                                {(r!.errors ?? []).slice(0, 10).map((e) => (
                                    <li key={e}>{t('pleoImport.result.errorRow', { row: e })}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                    {Object.entries(skippedByReason).map(([reason, files]) => (
                        <p key={reason}>
                            {t(`pleoImport.skipped.${reason}`, { count: files.length, files: files.join(', '), defaultValue: '' }) ||
                                t('pleoImport.skipped.UNREADABLE', { count: files.length, files: files.join(', ') })}
                        </p>
                    ))}
                    {outcome.failedFiles.length > 0 && (
                        <p>{t('pleoImport.result.uploadFailed', { count: outcome.failedFiles.length, files: outcome.failedFiles.join(', ') })}</p>
                    )}
                </div>
            )}

            <div className="flex justify-end gap-2.5 pt-1">
                <Button variant="outline" onClick={onClose}>
                    {t('common.close')}
                </Button>
                {onViewTransactions && (
                    <Button
                        onClick={() => {
                            onClose();
                            onViewTransactions();
                        }}
                    >
                        {t('pleoImport.result.viewTransactions')}
                    </Button>
                )}
            </div>
        </div>
    );
}

interface PleoImportDialogProps {
    accountId: number | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onViewTransactions?: (accountId: number) => void;
}

export function PleoImportDialog({ accountId, open, onOpenChange, onViewTransactions }: PleoImportDialogProps) {
    const { t } = useTranslation();
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] w-[92vw] max-w-xl overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{t('pleoImport.title')}</DialogTitle>
                </DialogHeader>
                {accountId != null && open && (
                    <PleoImport accountId={accountId} onClose={() => onOpenChange(false)} onViewTransactions={() => onViewTransactions?.(accountId)} />
                )}
            </DialogContent>
        </Dialog>
    );
}
