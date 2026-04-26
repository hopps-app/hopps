import type { CsvPreviewResponse } from '@hopps/api-client';
import { AlertCircle, CheckCircle, FileText, Loader2, UploadCloud, XCircle } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import Button from '@/components/ui/Button';
import Progress from '@/components/ui/Progress';
import { BaseSelect, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/shadecn/BaseSelect';
import {
    useBankSchemas,
    useBankSchemaTemplates,
    useCreateBankSchema,
    useCsvPreview,
    useStartImport,
    useBankAccount,
    useBankImport,
} from '@/hooks/queries/useBankAccounts';
import { cn } from '@/lib/utils';

type Step = 'file' | 'schema' | 'confirm' | 'progress' | 'result';

function formatBytes(bytes: number | undefined): string {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface StepIndicatorProps {
    steps: string[];
    current: number;
}

function StepIndicator({ steps, current }: StepIndicatorProps) {
    return (
        <div className="flex items-center gap-0 mb-6">
            {steps.map((label, i) => (
                <div key={i} className="flex items-center flex-1 last:flex-none">
                    <div className="flex flex-col items-center gap-1">
                        <div
                            className={cn(
                                'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors',
                                i < current
                                    ? 'bg-primary border-primary text-primary-foreground'
                                    : i === current
                                        ? 'border-primary text-primary bg-white'
                                        : 'border-gray-300 text-gray-400 bg-white'
                            )}
                        >
                            {i < current ? <CheckCircle className="w-4 h-4" /> : i + 1}
                        </div>
                        <span
                            className={cn(
                                'text-[10px] hidden sm:block',
                                i === current ? 'text-primary font-semibold' : 'text-muted-foreground'
                            )}
                        >
                            {label}
                        </span>
                    </div>
                    {i < steps.length - 1 && (
                        <div className={cn('flex-1 h-0.5 mx-1', i < current ? 'bg-primary' : 'bg-gray-200')} />
                    )}
                </div>
            ))}
        </div>
    );
}

interface ImportWizardProps {
    accountId: number;
}

export function ImportWizard({ accountId }: ImportWizardProps) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [step, setStep] = useState<Step>('file');
    const [file, setFile] = useState<File | null>(null);
    const [schemaId, setSchemaId] = useState<string>('');
    const [preview, setPreview] = useState<CsvPreviewResponse | null>(null);
    const [importId, setImportId] = useState<number | null>(null);
    const [pollInterval, setPollInterval] = useState<ReturnType<typeof setInterval> | null>(null);

    const { data: account } = useBankAccount(accountId);
    const { data: schemas = [] } = useBankSchemas(false);
    const { data: templates = [] } = useBankSchemaTemplates();
    const previewMutation = useCsvPreview();
    const startImportMutation = useStartImport();
    const createSchemaMutation = useCreateBankSchema();
    // Tracks org schema created on-the-fly from a template during this wizard session
    const createdSchemaRef = useRef<number | null>(null);

    // Set default schema from account
    useEffect(() => {
        if (account?.defaultSchemaId && !schemaId) {
            setSchemaId(`org:${account.defaultSchemaId}`);
        }
    }, [account, schemaId]);

    // Poll import status
    const { data: importStatus, refetch: refetchImport } = useBankImport(importId);

    useEffect(() => {
        if (step === 'progress' && importId) {
            const interval = setInterval(() => {
                refetchImport();
            }, 2000);
            setPollInterval(interval);
            return () => clearInterval(interval);
        }
        return () => {
            if (pollInterval) clearInterval(pollInterval);
        };
    }, [step, importId]);

    // Auto advance from progress to result
    useEffect(() => {
        if (
            step === 'progress' &&
            importStatus?.status &&
            ['COMPLETED', 'PARTIAL', 'FAILED'].includes(importStatus.status)
        ) {
            if (pollInterval) clearInterval(pollInterval);
            setStep('result');
        }
    }, [importStatus?.status, step]);

    // File drop
    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles[0]) {
            setFile(acceptedFiles[0]);
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        multiple: false,
        accept: { 'text/csv': ['.csv'], 'text/plain': ['.txt'] },
    });

    // schemaId is either "org:123" or "tpl:sparkasse-camt-v8"
    const isTemplateSelected = schemaId.startsWith('tpl:');
    const selectedSchema = isTemplateSelected
        ? undefined
        : schemas.find((s) => String(s.id) === schemaId);
    const selectedTemplate = isTemplateSelected
        ? templates.find((t) => `tpl:${t.templateId}` === schemaId)
        : undefined;
    const selectedName = selectedSchema?.name ?? selectedTemplate?.name ?? '—';

    const steps = [
        t('bankImport.wizard.stepFile'),
        t('bankImport.wizard.stepSchema'),
        t('bankImport.wizard.stepConfirm'),
        t('bankImport.wizard.stepProgress'),
        t('bankImport.wizard.stepResult'),
    ];
    const stepIndex = ['file', 'schema', 'confirm', 'progress', 'result'].indexOf(step);

    // ─── Step: File ───────────────────────────────────────────────────────────
    const renderFileStep = () => (
        <div className="flex flex-col gap-4">
            <h3 className="font-semibold text-base">{t('bankImport.wizard.fileTitle')}</h3>
            <div
                {...getRootProps()}
                className={cn(
                    'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-150',
                    isDragActive ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary/50',
                    file ? 'border-emerald-400 bg-emerald-50' : ''
                )}
            >
                <input {...getInputProps()} />
                {file ? (
                    <div className="flex flex-col items-center gap-2">
                        <FileText className="w-10 h-10 text-emerald-500" />
                        <p className="font-medium text-emerald-700">{file.name}</p>
                        <p className="text-sm text-muted-foreground">{formatBytes(file.size)}</p>
                        <p className="text-xs text-muted-foreground mt-1">{t('bankImport.wizard.fileDropReplace')}</p>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-3">
                        <UploadCloud className="w-10 h-10 text-muted-foreground" />
                        <p className="font-medium">{t('bankImport.wizard.fileDrop')}</p>
                        <p className="text-sm text-muted-foreground">{t('bankImport.wizard.fileDropHint')}</p>
                    </div>
                )}
            </div>

            <div className="flex justify-end">
                <Button onClick={() => setStep('schema')} disabled={!file}>
                    {t('common.next')}
                </Button>
            </div>
        </div>
    );

    // ─── Step: Schema ─────────────────────────────────────────────────────────
    const renderSchemaStep = () => (
        <div className="flex flex-col gap-4">
            <h3 className="font-semibold text-base">{t('bankImport.wizard.schemaTitle')}</h3>

            <div className="grid gap-1.5">
                <label className="text-sm font-medium">{t('bankImport.wizard.schemaSelect')}</label>
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
                                {templates.map((t) => (
                                    <SelectItem key={`tpl:${t.templateId}`} value={`tpl:${t.templateId}`}>
                                        {t.name}
                                    </SelectItem>
                                ))}
                            </SelectGroup>
                        )}
                    </SelectContent>
                </BaseSelect>
            </div>

            <Button
                variant="outline"
                disabled={!schemaId || !file || previewMutation.isPending || createSchemaMutation.isPending}
                onClick={async () => {
                    if (!file) return;
                    const result = await previewMutation.mutateAsync({ accountId, file });
                    setPreview(result);
                }}
            >
                {previewMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                {t('bankImport.wizard.previewButton')}
            </Button>

            {previewMutation.isError && (
                <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg p-3">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {t('bankImport.wizard.previewError')}
                </div>
            )}

            {preview && (
                <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-900 space-y-3">
                    <div className="flex flex-wrap gap-4 text-sm">
                        <span>
                            <span className="font-medium">{t('bankImport.preview.encoding')}:</span>{' '}
                            {preview.detectedEncoding}
                        </span>
                        <span>
                            <span className="font-medium">{t('bankImport.preview.delimiter')}:</span>{' '}
                            <code className="bg-gray-200 px-1 rounded">{preview.detectedDelimiter}</code>
                        </span>
                        <span>
                            <span className="font-medium">{t('bankImport.preview.totalLines')}:</span>{' '}
                            {preview.totalLines}
                        </span>
                    </div>

                    {!preview.encodingValid && preview.encodingWarning && (
                        <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 rounded-lg p-3">
                            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                            {preview.encodingWarning}
                        </div>
                    )}

                    {preview.sampleRows && preview.sampleRows.length > 0 && (
                        <div className="overflow-x-auto">
                            <table className="text-xs w-full border-collapse">
                                <thead>
                                    <tr className="border-b border-gray-200">
                                        {preview.headerColumns?.map((col, i) => (
                                            <th key={i} className="py-1 px-2 text-left font-medium text-muted-foreground whitespace-nowrap">
                                                {col}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {preview.sampleRows.slice(0, 5).map((row, ri) => (
                                        <tr key={ri} className="border-b border-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800">
                                            {row.map((cell, ci) => (
                                                <td key={ci} className="py-1 px-2 whitespace-nowrap max-w-[200px] truncate">
                                                    {cell}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep('file')}>
                    {t('common.goBack')}
                </Button>
                <Button onClick={() => setStep('confirm')} disabled={!schemaId || (!isTemplateSelected && !selectedSchema)}>
                    {t('common.next')}
                </Button>
            </div>
        </div>
    );

    // ─── Step: Confirm ────────────────────────────────────────────────────────
    const renderConfirmStep = () => (
        <div className="flex flex-col gap-4">
            <h3 className="font-semibold text-base">{t('bankImport.wizard.confirmTitle')}</h3>

            <div className="border rounded-xl p-5 bg-gray-50 dark:bg-gray-900 space-y-3">
                <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    <div>
                        <p className="font-medium">{file?.name}</p>
                        <p className="text-sm text-muted-foreground">{formatBytes(file?.size)}</p>
                    </div>
                </div>
                <hr className="border-gray-200 dark:border-gray-700" />
                <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('bankImport.confirm.schema')}:</span>
                        <span className="font-medium">{selectedName}</span>
                    </div>
                    {preview && (
                        <>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">{t('bankImport.confirm.encoding')}:</span>
                                <span>{preview.detectedEncoding}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">{t('bankImport.confirm.totalLines')}:</span>
                                <span>{preview.totalLines}</span>
                            </div>
                        </>
                    )}
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('bankImport.confirm.account')}:</span>
                        <span>{account?.name}</span>
                    </div>
                </div>
            </div>

            <Button
                className="w-full"
                onClick={async () => {
                    if (!file) return;
                    let resolvedSchemaId: number;
                    if (isTemplateSelected && selectedTemplate) {
                        // Reuse org schema created in this wizard session, or create a new one
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
                    const result = await startImportMutation.mutateAsync({
                        accountId,
                        file,
                        schemaId: resolvedSchemaId,
                    });
                    setImportId(result.id ?? null);
                    setStep('progress');
                }}
                disabled={startImportMutation.isPending || createSchemaMutation.isPending}
            >
                {startImportMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                {t('bankImport.wizard.startImport')}
            </Button>

            <div className="flex justify-start">
                <Button variant="outline" onClick={() => setStep('schema')}>
                    {t('common.goBack')}
                </Button>
            </div>
        </div>
    );

    // ─── Step: Progress ───────────────────────────────────────────────────────
    const renderProgressStep = () => (
        <div className="flex flex-col gap-6 items-center py-6">
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
            <div className="w-full max-w-sm space-y-2">
                <Progress value={importStatus?.progress ?? 0} className="h-2" />
                <p className="text-center text-sm text-muted-foreground">
                    {importStatus?.progress ?? 0}%
                </p>
            </div>
            <div className="space-y-1 text-sm text-center">
                <p className="font-medium">{t('bankImport.progress.processing')}</p>
                {importStatus?.importedRows !== undefined && (
                    <p className="text-muted-foreground">
                        {t('bankImport.progress.rows', {
                            imported: importStatus.importedRows,
                            total: importStatus.totalRows ?? '?',
                        })}
                    </p>
                )}
            </div>
        </div>
    );

    // ─── Step: Result ─────────────────────────────────────────────────────────
    const renderResultStep = () => {
        const status = importStatus?.status;
        const isSuccess = status === 'COMPLETED';
        const isPartial = status === 'PARTIAL';
        const isFailed = status === 'FAILED';

        return (
            <div className="flex flex-col gap-6 items-center py-6">
                {isSuccess && <CheckCircle className="w-14 h-14 text-emerald-500" />}
                {isPartial && <AlertCircle className="w-14 h-14 text-amber-500" />}
                {isFailed && <XCircle className="w-14 h-14 text-red-500" />}

                <h3 className="text-xl font-semibold text-center">
                    {isSuccess && t('bankImport.result.success')}
                    {isPartial && t('bankImport.result.partial')}
                    {isFailed && t('bankImport.result.failed')}
                </h3>

                {importStatus && (
                    <div className="border rounded-xl p-4 bg-gray-50 dark:bg-gray-900 w-full max-w-sm space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">{t('bankImport.result.imported')}:</span>
                            <span className="font-medium text-emerald-600">{importStatus.importedRows ?? 0}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">{t('bankImport.result.duplicates')}:</span>
                            <span>{importStatus.duplicateRows ?? 0}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">{t('bankImport.result.errors')}:</span>
                            <span className={importStatus.errorRows ? 'text-red-500' : ''}>{importStatus.errorRows ?? 0}</span>
                        </div>
                    </div>
                )}

                {isFailed && importStatus?.failureReason && (
                    <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 rounded-lg p-3 w-full max-w-sm">
                        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        {importStatus.failureReason}
                    </div>
                )}

                <div className="flex gap-3">
                    <Button variant="outline" onClick={() => navigate(`/bank-accounts/${accountId}`)}>
                        {t('bankImport.result.backToAccount')}
                    </Button>
                    {!isFailed && (
                        <Button onClick={() => navigate(`/bank-accounts/${accountId}`)}>
                            {t('bankImport.result.viewTransactions')}
                        </Button>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="max-w-2xl mx-auto">
            <StepIndicator steps={steps} current={stepIndex} />

            <div className="bg-white dark:bg-gray-800 rounded-[20px] shadow border border-gray-100 dark:border-gray-700 p-6">
                {step === 'file' && renderFileStep()}
                {step === 'schema' && renderSchemaStep()}
                {step === 'confirm' && renderConfirmStep()}
                {step === 'progress' && renderProgressStep()}
                {step === 'result' && renderResultStep()}
            </div>
        </div>
    );
}
