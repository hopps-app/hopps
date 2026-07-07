import type { CsvPreviewResponse } from '@hopps/api-client';
import { AlertCircle, CheckCircle, Info, Loader2, Sheet, Sparkles, XCircle } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useTranslation } from 'react-i18next';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import Button from '@/components/ui/Button';
import Progress from '@/components/ui/Progress';
import { BaseSelect, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/shadecn/BaseSelect';
import {
    useBankSchemas,
    useBankSchemaTemplates,
    useCreateBankSchema,
    useCsvPreview,
    useSuggestSchema,
    useStartImport,
    useBankAccount,
    useBankImport,
    bankTransactionKeys,
    bankAccountKeys,
    bankImportKeys,
} from '@/hooks/queries/useBankAccounts';
import { cn } from '@/lib/utils';

type WizardState = 'drop' | 'previewing' | 'preview' | 'importing' | 'done';

interface ImportWizardProps {
    accountId: number;
    onClose?: () => void;
}

export function ImportWizard({ accountId, onClose }: ImportWizardProps) {
    const { t } = useTranslation();
    const queryClient = useQueryClient();

    const [state, setState] = useState<WizardState>('drop');
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<CsvPreviewResponse | null>(null);
    // schemaId is "org:123" | "tpl:sparkasse-camt-v8" | "" (not yet chosen)
    const [schemaId, setSchemaId] = useState<string>('');
    const [importId, setImportId] = useState<number | null>(null);
    const [showAllCols, setShowAllCols] = useState(false);

    const { data: account } = useBankAccount(accountId);
    const { data: schemas = [] } = useBankSchemas(false);
    const { data: templates = [] } = useBankSchemaTemplates();
    const previewMutation = useCsvPreview();
    const startImportMutation = useStartImport();
    const createSchemaMutation = useCreateBankSchema();
    const createdSchemaRef = useRef<number | null>(null);

    const isMt940 = preview?.fileType === 'MT940';

    // Auto-detect schema from header columns once preview is loaded (CSV only)
    const headerColumns = !isMt940 ? (preview?.headerColumns ?? null) : null;
    const { data: detection } = useSuggestSchema(accountId, headerColumns);

    // When detection result arrives and no schema is manually chosen yet, apply it
    useEffect(() => {
        if (isMt940 || !detection || schemaId) return;
        if (detection.type === 'ORG' && detection.schemaId) {
            setSchemaId(`org:${detection.schemaId}`);
        } else if (detection.type === 'TEMPLATE' && detection.templateId) {
            setSchemaId(`tpl:${detection.templateId}`);
        }
    }, [detection, isMt940, schemaId]);

    // Poll import progress
    const { data: importStatus } = useBankImport(importId);
    useEffect(() => {
        if (state === 'importing' && importStatus?.status && ['COMPLETED', 'PARTIAL', 'FAILED'].includes(importStatus.status)) {
            setState('done');
            // A successful (or partial) import created new bank transactions and changed
            // account balances / import history. The transaction queries have a 5-minute
            // staleTime, so they won't refetch on their own when the user navigates to the
            // transactions list — invalidate them explicitly so the new rows show up.
            if (importStatus.status !== 'FAILED') {
                queryClient.invalidateQueries({ queryKey: bankTransactionKeys.all });
                queryClient.invalidateQueries({ queryKey: bankAccountKeys.lists() });
                queryClient.invalidateQueries({ queryKey: bankAccountKeys.detail(accountId) });
                queryClient.invalidateQueries({ queryKey: bankImportKeys.byAccount(accountId) });
            }
        }
    }, [importStatus?.status, state, queryClient, accountId]);

    const isDetecting = state === 'preview' && !isMt940 && headerColumns != null && detection == null;
    const isTemplateSelected = schemaId.startsWith('tpl:');
    const selectedSchema = isTemplateSelected ? undefined : schemas.find((s) => String(s.id) === schemaId.replace('org:', ''));
    const selectedTemplate = isTemplateSelected ? templates.find((tpl) => `tpl:${tpl.templateId}` === schemaId) : undefined;
    const selectedName = selectedSchema?.name ?? selectedTemplate?.name ?? '';
    const detectionFailed = state === 'preview' && !isMt940 && detection?.type === 'NONE';

    // Trigger preview automatically on drop
    const loadPreview = useCallback(
        async (f: File) => {
            setState('previewing');
            setSchemaId('');
            setShowAllCols(false);
            try {
                const result = await previewMutation.mutateAsync({ accountId, file: f });
                setPreview(result);
                setState('preview');
            } catch {
                setState('drop');
            }
        },
        [accountId, previewMutation]
    );

    const onDrop = useCallback(
        (acceptedFiles: File[]) => {
            const f = acceptedFiles[0];
            if (!f) return;
            setFile(f);
            loadPreview(f);
        },
        [loadPreview]
    );

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        multiple: false,
        accept: { 'text/csv': ['.csv'], 'text/plain': ['.txt'] },
        disabled: state === 'previewing',
    });

    const handleImport = async () => {
        if (!file) return;
        if (!isMt940 && !schemaId) return;
        setState('importing');
        let resolvedSchemaId: number | undefined;
        if (!isMt940) {
            if (isTemplateSelected && selectedTemplate) {
                if (createdSchemaRef.current) {
                    resolvedSchemaId = createdSchemaRef.current;
                } else {
                    const created = await createSchemaMutation.mutateAsync({
                        fromTemplate: selectedTemplate.templateId,
                        data: {
                            name: selectedTemplate.name ?? selectedTemplate.templateId ?? 'Schema',
                            amountStrategy: selectedTemplate.amountStrategy ?? 'SIGNED_SINGLE_COLUMN',
                            columnMappings: (selectedTemplate.columnMappings ?? []).map((m) => ({
                                targetField: m.targetField!,
                                sourceColumnIndex: m.sourceColumnIndex ?? undefined,
                                sourceColumnName: m.sourceColumnName ?? undefined,
                                transform: m.transform ?? undefined,
                            })),
                        },
                    });
                    resolvedSchemaId = created.id!;
                    createdSchemaRef.current = resolvedSchemaId;
                }
            } else {
                resolvedSchemaId = Number(schemaId.replace('org:', ''));
            }
        }
        const result = await startImportMutation.mutateAsync({ accountId, file, schemaId: resolvedSchemaId });
        setImportId(result.id ?? null);
    };

    // ── Drop / uploading ─────────────────────────────────────────────────────────
    if (state === 'drop' || state === 'previewing') {
        return (
            <div
                {...getRootProps()}
                className={cn(
                    'border-2 border-dashed rounded-2xl p-10 flex flex-col items-center text-center gap-4 cursor-pointer transition-all duration-150 select-none',
                    isDragActive ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-primary/40',
                    state === 'previewing' ? 'opacity-50 pointer-events-none' : ''
                )}
            >
                <input {...getInputProps()} />
                <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary grid place-items-center">
                    {state === 'previewing' ? <Loader2 className="w-7 h-7 animate-spin" /> : <Sheet className="w-7 h-7" />}
                </div>
                <div>
                    <p className="text-[17px] font-extrabold">{t('bankImport.wizard.fileDrop')}</p>
                    <p className="text-sm text-muted-foreground mt-1 max-w-sm leading-relaxed">{t('bankImport.wizard.dropSubtitle')}</p>
                </div>
                <p className="text-xs text-muted-foreground">{t('bankImport.wizard.fileDropHint')}</p>
                {previewMutation.isError && (
                    <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-xl px-3 py-2 w-full">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        {t('bankImport.wizard.previewError')}
                    </div>
                )}
            </div>
        );
    }

    // ── Preview ───────────────────────────────────────────────────────────────────
    if (state === 'preview' && preview) {
        const totalRows = preview.totalLines ?? 0;

        return (
            <div className="flex flex-col gap-3 min-w-0">
                {/* Format detection banner */}
                {isMt940 ? (
                    <div className="flex items-center gap-3 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 rounded-xl px-4 py-3">
                        <Sparkles className="w-5 h-5 flex-shrink-0" />
                        <p className="text-[13.5px] font-semibold">
                            {t('bankImport.wizard.mt940Detected', { count: totalRows })}
                        </p>
                    </div>
                ) : isDetecting ? (
                    <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3 text-muted-foreground text-sm">
                        <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
                        {t('bankImport.wizard.detecting')}
                    </div>
                ) : detection?.type !== 'NONE' && selectedName ? (
                    <div className="flex items-center gap-3 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 rounded-xl px-4 py-3">
                        <Sparkles className="w-5 h-5 flex-shrink-0" />
                        <p className="text-[13.5px] font-semibold">
                            {t('bankImport.wizard.formatDetected', {
                                schema: selectedName,
                                account: account?.name ?? '',
                                lines: totalRows,
                            })}
                        </p>
                    </div>
                ) : (
                    <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 rounded-xl px-4 py-3">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <p className="text-[13.5px] font-semibold">{t('bankImport.wizard.noFormatDetected')}</p>
                    </div>
                )}

                {/* Manual schema picker — only shown when auto-detection failed */}
                {detectionFailed || (detection?.type === 'NONE' && schemaId) ? (
                    <div className="grid gap-1.5">
                        <label className="text-sm font-medium">{t('bankImport.wizard.schemaRequired')}</label>
                        <BaseSelect value={schemaId} onValueChange={setSchemaId}>
                            <SelectTrigger>
                                <SelectValue placeholder={t('bankImport.wizard.schemaPlaceholder')} />
                            </SelectTrigger>
                            <SelectContent>
                                {schemas.length > 0 && (
                                    <SelectGroup>
                                        <SelectLabel>{t('bankImport.wizard.schemaGroupOrg')}</SelectLabel>
                                        {schemas.map((s) => (
                                            <SelectItem key={`org:${s.id}`} value={`org:${s.id}`}>
                                                {s.name}
                                            </SelectItem>
                                        ))}
                                    </SelectGroup>
                                )}
                                {templates.length > 0 && (
                                    <SelectGroup>
                                        <SelectLabel>{t('bankImport.wizard.schemaGroupTemplates')}</SelectLabel>
                                        {templates.map((tpl) => (
                                            <SelectItem key={`tpl:${tpl.templateId}`} value={`tpl:${tpl.templateId}`}>
                                                {tpl.name}
                                            </SelectItem>
                                        ))}
                                    </SelectGroup>
                                )}
                            </SelectContent>
                        </BaseSelect>
                    </div>
                ) : null}

                {/* Encoding warning */}
                {!preview.encodingValid && preview.encodingWarning && (
                    <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 dark:bg-amber-950/30 rounded-xl p-3">
                        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        {preview.encodingWarning}
                    </div>
                )}

                {/* Sample rows table */}
                {preview.sampleRows && preview.sampleRows.length > 0 && (() => {
                    const MAX_COLS = 6;
                    const allCols = preview.headerColumns ?? [];
                    // CSV: sampleRows[0] is the header row duplicated — skip it
                    const dataRows = !isMt940 ? preview.sampleRows.slice(1, 6) : preview.sampleRows.slice(0, 5);
                    // Drop columns where every data row has the same value (e.g. own IBAN in AUFTRAGSKONTO)
                    const interestingIndices = allCols
                        .map((_, ci) => ci)
                        .filter((ci) => {
                            if (dataRows.length === 0) return true;
                            const first = dataRows[0][ci] ?? '';
                            return dataRows.some((r) => (r[ci] ?? '') !== first);
                        });
                    const visibleIndices = showAllCols ? interestingIndices : interestingIndices.slice(0, MAX_COLS);
                    const hiddenCount = interestingIndices.length - visibleIndices.length;
                    return (
                        <div className={cn('rounded-xl border border-gray-200 dark:border-gray-700 w-full', showAllCols ? 'overflow-x-auto' : 'overflow-hidden')}>
                            <table className={cn('text-[11px] border-collapse', showAllCols ? 'w-max' : 'w-full table-fixed')}>
                                <thead>
                                    <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                                        {visibleIndices.map((ci) => (
                                            <th key={ci} className={cn('py-2 px-3 text-left font-semibold text-muted-foreground uppercase tracking-wide text-[10px]', showAllCols ? 'whitespace-nowrap' : 'truncate')}>
                                                {allCols[ci]}
                                            </th>
                                        ))}
                                        {hiddenCount > 0 ? (
                                            <th className="py-2 px-3 w-10">
                                                <button
                                                    type="button"
                                                    onClick={() => setShowAllCols(true)}
                                                    className="text-[10px] font-semibold text-primary hover:underline whitespace-nowrap"
                                                >
                                                    +{hiddenCount} {t('bankImport.wizard.showMore')}
                                                </button>
                                            </th>
                                        ) : showAllCols && interestingIndices.length > MAX_COLS ? (
                                            <th className="py-2 px-3 w-10">
                                                <button
                                                    type="button"
                                                    onClick={() => setShowAllCols(false)}
                                                    className="text-[10px] font-semibold text-muted-foreground hover:underline whitespace-nowrap"
                                                >
                                                    {t('bankImport.wizard.showLess')}
                                                </button>
                                            </th>
                                        ) : null}
                                    </tr>
                                </thead>
                                <tbody>
                                    {dataRows.map((row, ri) => (
                                        <tr key={ri} className="border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-gray-50/60 dark:hover:bg-gray-800/40">
                                            {visibleIndices.map((ci) => (
                                                <td key={ci} className={cn('py-2 px-3', showAllCols ? 'whitespace-nowrap max-w-[200px] truncate' : 'truncate')} title={row[ci] ?? ''}>
                                                    {row[ci] ?? ''}
                                                </td>
                                            ))}
                                            {hiddenCount > 0 && <td className="py-2 px-3 w-10 text-muted-foreground opacity-30">…</td>}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    );
                })()}

                {/* Actions */}
                <div className="flex items-center gap-3">
                    <Button variant="outline" onClick={() => { setState('drop'); setPreview(null); setSchemaId(''); }}>
                        {t('common.goBack')}
                    </Button>
                    <div className="flex-1" />
                    <Button onClick={handleImport} disabled={(!isMt940 && !schemaId) || isDetecting}>
                        {t('bankImport.wizard.importBtn', { count: totalRows })}
                    </Button>
                </div>
            </div>
        );
    }

    // ── Importing ─────────────────────────────────────────────────────────────────
    if (state === 'importing') {
        return (
            <div className="flex flex-col items-center gap-6 py-8">
                <Loader2 className="w-12 h-12 text-primary animate-spin" />
                <div className="w-full max-w-xs space-y-2">
                    <Progress value={importStatus?.progress ?? 0} className="h-2" />
                    <p className="text-center text-sm text-muted-foreground">{importStatus?.progress ?? 0}%</p>
                </div>
                <p className="font-semibold">{t('bankImport.progress.processing')}</p>
                {importStatus?.importedRows !== undefined && (
                    <p className="text-sm text-muted-foreground">
                        {t('bankImport.progress.rows', { imported: importStatus.importedRows, total: importStatus.totalRows ?? '?' })}
                    </p>
                )}
            </div>
        );
    }

    // ── Done ──────────────────────────────────────────────────────────────────────
    if (state === 'done') {
        const status = importStatus?.status;
        const isSuccess = status === 'COMPLETED';
        const isPartial = status === 'PARTIAL';
        const isFailed = status === 'FAILED';

        return (
            <div className="flex flex-col items-center gap-5 py-6">
                {isSuccess && <CheckCircle className="w-14 h-14 text-emerald-500" />}
                {isPartial && <AlertCircle className="w-14 h-14 text-amber-500" />}
                {isFailed && <XCircle className="w-14 h-14 text-red-500" />}

                <h3 className="text-xl font-bold text-center">
                    {isSuccess && t('bankImport.result.success')}
                    {isPartial && t('bankImport.result.partial')}
                    {isFailed && t('bankImport.result.failed')}
                </h3>

                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 w-full max-w-xs divide-y divide-gray-100 dark:divide-gray-800">
                    <div className="flex justify-between items-center px-4 py-3 text-sm">
                        <span className="text-muted-foreground">{t('bankImport.result.imported')}</span>
                        <span className="font-semibold text-emerald-600">{importStatus?.importedRows ?? 0}</span>
                    </div>
                    <div className="flex justify-between items-center px-4 py-3 text-sm">
                        <span className="text-muted-foreground">{t('bankImport.result.duplicates')}</span>
                        <span className="font-semibold">{importStatus?.duplicateRows ?? 0}</span>
                    </div>
                    <div className="flex justify-between items-center px-4 py-3 text-sm">
                        <span className="text-muted-foreground">{t('bankImport.result.errors')}</span>
                        <span className={cn('font-semibold', importStatus?.errorRows ? 'text-red-500' : '')}>{importStatus?.errorRows ?? 0}</span>
                    </div>
                </div>

                {isFailed && importStatus?.failureReason && (
                    <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 rounded-xl p-3 w-full max-w-xs">
                        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        {importStatus.failureReason}
                    </div>
                )}

                <Button onClick={() => onClose?.()}>
                    {t('bankImport.result.viewTransactions')}
                </Button>
            </div>
        );
    }

    return null;
}

// ── Dialog wrapper ────────────────────────────────────────────────────────────

interface ImportWizardDialogProps {
    accountId: number | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ImportWizardDialog({ accountId, open, onOpenChange }: ImportWizardDialogProps) {
    const { t } = useTranslation();
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl w-[90vw]">
                <DialogHeader>
                    <DialogTitle>{t('bankImport.title')}</DialogTitle>
                    <p className="text-sm text-muted-foreground">{t('bankImport.wizard.dropSubtitle')}</p>
                </DialogHeader>
                {accountId != null && (
                    <ImportWizard accountId={accountId} onClose={() => onOpenChange(false)} />
                )}
            </DialogContent>
        </Dialog>
    );
}
