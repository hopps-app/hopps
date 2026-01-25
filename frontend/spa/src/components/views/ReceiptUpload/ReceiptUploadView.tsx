import type { AnalysisStatus } from '@hopps/api-client';
import { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { ReceiptFormActions, ReceiptFormFields } from './components';
import { useReceiptForm } from './hooks';

import InvoiceUploadFormDropzone from '@/components/InvoiceUploadForm/InvoiceUploadFormDropzone';
import Switch from '@/components/ui/Switch';
import { useToast } from '@/hooks/use-toast';
import apiService from '@/services/ApiService';
import { useBommelsStore } from '@/store/bommels/bommelsStore';
import { useStore } from '@/store/store';

const POLLING_INTERVAL = 2000; // 2 seconds

const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'];

function isAllowedFileType(file: File): boolean {
    const mime = file.type || '';
    const nameLower = file.name.toLowerCase();
    return ALLOWED_MIME_TYPES.includes(mime) || ALLOWED_EXTENSIONS.some((ext) => nameLower.endsWith(ext));
}

function ReceiptUploadView() {
    const { t } = useTranslation();
    const { showError, showSuccess } = useToast();
    const { loadBommels } = useBommelsStore();
    const store = useStore();

    const {
        file,
        setFile,
        receiptNumber,
        setReceiptNumber,
        receiptDate,
        setReceiptDate,
        dueDate,
        setDueDate,
        transactionKind,
        setTransactionKind,
        isUnpaid,
        setIsUnpaid,
        contractPartner,
        setContractPartner,
        bommelId,
        setBommelId,
        category,
        setCategory,
        area,
        setArea,
        tags,
        setTags,
        netAmount,
        setNetAmount,
        taxAmount,
        setTaxAmount,
        isSubmitting,
        setIsSubmitting,
        isAutoRead,
        setIsAutoRead,
        loadingStates,
        setAllFieldsLoading,
        resetForm,
        isValid,
        documentId,
        setDocumentId,
        analysisStatus,
        setAnalysisStatus,
        analysisError,
        setAnalysisError,
        extractionSource,
        applyAnalysisResult,
    } = useReceiptForm();

    const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Helper to check if analysis is still in progress
    const isAnalyzing = analysisStatus === 'PENDING' || analysisStatus === 'ANALYZING';

    // Poll for analysis results
    useEffect(() => {
        if (!documentId || !isAutoRead || !isAnalyzing) {
            if (pollingRef.current) {
                clearInterval(pollingRef.current);
                pollingRef.current = null;
            }
            return;
        }

        const pollAnalysisStatus = async () => {
            try {
                const response = await apiService.orgService.documentsGET(documentId);
                const status = response.analysisStatus as AnalysisStatus;
                setAnalysisStatus(status);

                if (status === 'COMPLETED') {
                    applyAnalysisResult(response);
                    showSuccess(t('receipts.upload.analysis.completed'));
                } else if (status === 'FAILED') {
                    setAnalysisError(response.analysisError ?? null);
                    setAllFieldsLoading(false);
                    showError(t('receipts.upload.analysis.failed'));
                }
            } catch (e) {
                console.error('Failed to poll analysis status:', e);
            }
        };

        // Start polling
        pollingRef.current = setInterval(pollAnalysisStatus, POLLING_INTERVAL);

        // Poll immediately on mount
        pollAnalysisStatus();

        return () => {
            if (pollingRef.current) {
                clearInterval(pollingRef.current);
                pollingRef.current = null;
            }
        };
    }, [documentId, isAutoRead, isAnalyzing, setAnalysisStatus, setAnalysisError, applyAnalysisResult, setAllFieldsLoading, showSuccess, showError, t]);

    useEffect(() => {
        if (!store.organization) return;
        loadBommels(store.organization.id).catch(() => {});
    }, [store.organization, loadBommels]);

    const onFilesChanged = useCallback(
        async (files: File[]) => {
            const selected = files[0] ?? null;
            setFile(selected);
            if (!selected) return;
            if (isSubmitting) return;

            if (!isAllowedFileType(selected)) {
                showError(t('validation.invalidFileType'));
                return;
            }

            try {
                setIsSubmitting(true);

                if (isAutoRead) {
                    setAllFieldsLoading(true);
                }

                const response = await apiService.orgService.documentsPOST({
                    data: selected,
                    fileName: selected.name,
                });
                showSuccess(t('receipts.upload.uploadSuccess'));

                // If auto-read is enabled, track the document for polling
                if (isAutoRead && response.id) {
                    setDocumentId(response.id);
                    setAnalysisStatus(response.analysisStatus ?? 'PENDING');
                    setAnalysisError(null);
                } else {
                    setFile(null);
                }
            } catch (e) {
                console.error(e);
                showError(t('receipts.upload.uploadFailed'));
                setAllFieldsLoading(false);
            } finally {
                setIsSubmitting(false);
            }
        },
        [isSubmitting, showError, showSuccess, isAutoRead, setFile, setIsSubmitting, setAllFieldsLoading, setDocumentId, setAnalysisStatus, setAnalysisError, t]
    );

    const handleSubmit = useCallback(async () => {
        if (!isValid) {
            showError(t('common.validationError'));
            return;
        }
        if (!file || !bommelId) return;

        try {
            setIsSubmitting(true);
            await apiService.orgService.documentsPOST({
                data: file,
                fileName: file.name,
            });

            showSuccess(t('receipts.upload.uploadSuccess'));
            resetForm();
        } catch (e) {
            console.error(e);
            showError(t('receipts.upload.uploadFailed'));
        } finally {
            setIsSubmitting(false);
        }
    }, [isValid, file, bommelId, showError, showSuccess, resetForm, setIsSubmitting, t]);

    const handleSaveDraft = useCallback(() => {
        // TODO: Implement draft saving
    }, []);

    const handleCancel = useCallback(() => {
        window.history.back();
    }, []);

    return (
        <div className="flex flex-col gap-4">
            <h2 className="text-2xl font-semibold shrink-0">{t('receipts.upload.title')}</h2>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:items-start">
                <div className="min-h-[300px] sm:min-h-[350px] md:self-stretch">
                    <InvoiceUploadFormDropzone onFilesChanged={onFilesChanged} previewFile={file} />
                </div>

                <div className="flex flex-col gap-4">
                    <div className="min-w-0 border border-grey-700 p-3 sm:p-4 rounded-[20px] sm:rounded-[30px]">
                        {/* Analysis Status Banner */}
                        {analysisStatus && isAutoRead && (
                            <div
                                className={`mb-3 p-3 sm:p-4 rounded-lg text-sm ${
                                    analysisStatus === 'COMPLETED'
                                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                        : analysisStatus === 'FAILED'
                                          ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                          : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                }`}
                            >
                                <div className="flex items-center gap-2">
                                    {isAnalyzing && (
                                        <svg className="animate-spin h-4 w-4 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path
                                                className="opacity-75"
                                                fill="currentColor"
                                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                            ></path>
                                        </svg>
                                    )}
                                    <span className="font-medium">
                                        {analysisStatus === 'PENDING' && t('receipts.upload.analysis.pending')}
                                        {analysisStatus === 'ANALYZING' && t('receipts.upload.analysis.analyzing')}
                                        {analysisStatus === 'COMPLETED' && t('receipts.upload.analysis.completed')}
                                        {analysisStatus === 'FAILED' &&
                                            (analysisError
                                                ? t('receipts.upload.analysis.error', { error: analysisError })
                                                : t('receipts.upload.analysis.failed'))}
                                    </span>
                                </div>
                                {analysisStatus === 'COMPLETED' && (
                                    <div className="mt-2 space-y-1">
                                        <p className="text-xs opacity-90">{t('receipts.upload.analysis.completedDescription')}</p>
                                        <p className="text-xs font-medium">
                                            {extractionSource === 'ZUGFERD'
                                                ? t('receipts.upload.analysis.extractedViaZugferd')
                                                : t('receipts.upload.analysis.extractedViaDocumentAI')}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        <ReceiptFormFields
                            receiptNumber={receiptNumber}
                            onReceiptNumberChange={setReceiptNumber}
                            receiptDate={receiptDate}
                            onReceiptDateChange={setReceiptDate}
                            dueDate={dueDate}
                            onDueDateChange={setDueDate}
                            transactionKind={transactionKind}
                            onTransactionKindChange={setTransactionKind}
                            isUnpaid={isUnpaid}
                            onIsUnpaidChange={setIsUnpaid}
                            contractPartner={contractPartner}
                            onContractPartnerChange={setContractPartner}
                            bommelId={bommelId}
                            onBommelIdChange={setBommelId}
                            category={category}
                            onCategoryChange={setCategory}
                            area={area}
                            onAreaChange={setArea}
                            tags={tags}
                            onTagsChange={setTags}
                            netAmount={netAmount}
                            onNetAmountChange={setNetAmount}
                            taxAmount={taxAmount}
                            onTaxAmountChange={setTaxAmount}
                            loadingStates={loadingStates}
                        />
                    </div>

                    <div className="flex items-center">
                        <Switch checked={isAutoRead} onCheckedChange={() => setIsAutoRead((v) => !v)} label={t('receipts.upload.autoRead')} />
                    </div>

                    <ReceiptFormActions isValid={isValid} onSubmit={handleSubmit} onSaveDraft={handleSaveDraft} onCancel={handleCancel} />
                </div>
            </div>
        </div>
    );
}

export default ReceiptUploadView;
