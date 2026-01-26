import type { AnalysisStatus } from '@hopps/api-client';
import { TransactionCreateRequest, TransactionUpdateRequest } from '@hopps/api-client';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

import { ReceiptFormActions, ReceiptFormFields } from './components';
import { useReceiptForm } from './hooks';

import InvoiceUploadFormDropzone from '@/components/InvoiceUploadForm/InvoiceUploadFormDropzone';
import Switch from '@/components/ui/Switch';
import { transactionKeys } from '@/hooks/queries/useTransactions';
import { useToast } from '@/hooks/use-toast';
import apiService from '@/services/ApiService';
import { useBommelsStore } from '@/store/bommels/bommelsStore';
import { useStore } from '@/store/store';

const POLLING_INTERVAL_BASE = 2000; // 2 seconds base interval
const POLLING_MAX_INTERVAL = 30000; // 30 seconds max interval
const POLLING_MAX_ERRORS = 5; // Stop polling after 5 consecutive errors
const POLLING_MAX_DURATION = 5 * 60 * 1000; // 5 minutes max polling duration

const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'];

function isAllowedFileType(file: File): boolean {
    const mime = file.type || '';
    const nameLower = file.name.toLowerCase();
    return ALLOWED_MIME_TYPES.includes(mime) || ALLOWED_EXTENSIONS.some((ext) => nameLower.endsWith(ext));
}

function ReceiptUploadView() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const { showError, showSuccess } = useToast();
    const { loadBommels } = useBommelsStore();
    const store = useStore();
    const queryClient = useQueryClient();

    // Edit mode state
    const isEditMode = Boolean(id);
    const [isLoadingTransaction, setIsLoadingTransaction] = useState(false);
    const [documentUrl, setDocumentUrl] = useState<string | null>(null);
    const [documentContentType, setDocumentContentType] = useState<string>('application/pdf');

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
        canSaveDraft,
        documentId,
        setDocumentId,
        transactionId,
        setTransactionId,
        analysisStatus,
        setAnalysisStatus,
        analysisError,
        setAnalysisError,
        extractionSource,
        applyAnalysisResult,
        applyAnalysisResultToEmptyFields,
        loadTransaction,
    } = useReceiptForm();

    const pollingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const consecutiveErrorsRef = useRef(0);
    const pollingStartTimeRef = useRef<number | null>(null);

    // Helper to check if analysis is still in progress
    const isAnalyzing = analysisStatus === 'PENDING' || analysisStatus === 'ANALYZING';

    // Calculate next polling interval with exponential backoff
    const getNextPollingInterval = useCallback((errorCount: number) => {
        if (errorCount === 0) return POLLING_INTERVAL_BASE;
        // Exponential backoff: 2s, 4s, 8s, 16s, 30s (capped)
        return Math.min(POLLING_INTERVAL_BASE * Math.pow(2, errorCount), POLLING_MAX_INTERVAL);
    }, []);

    // Poll for analysis results with retry logic and exponential backoff
    useEffect(() => {
        if (!documentId || !isAutoRead || !isAnalyzing) {
            if (pollingRef.current) {
                clearTimeout(pollingRef.current);
                pollingRef.current = null;
            }
            consecutiveErrorsRef.current = 0;
            pollingStartTimeRef.current = null;
            return;
        }

        // Initialize polling start time
        if (pollingStartTimeRef.current === null) {
            pollingStartTimeRef.current = Date.now();
        }

        const pollAnalysisStatus = async () => {
            // Check if max polling duration exceeded
            if (pollingStartTimeRef.current && Date.now() - pollingStartTimeRef.current > POLLING_MAX_DURATION) {
                console.warn('Polling timeout: exceeded maximum duration');
                setAnalysisStatus('FAILED');
                setAnalysisError(t('receipts.upload.analysis.pollingTimeout'));
                setAllFieldsLoading(false);
                showError(t('receipts.upload.analysis.pollingTimeout'));
                return;
            }

            try {
                const response = await apiService.orgService.documentsGET(documentId);
                const status = response.analysisStatus as AnalysisStatus;
                setAnalysisStatus(status);

                // Reset error count on successful response
                consecutiveErrorsRef.current = 0;

                if (status === 'COMPLETED') {
                    applyAnalysisResult(response);
                    showSuccess(t('receipts.upload.analysis.completed'));
                } else if (status === 'FAILED') {
                    setAnalysisError(response.analysisError ?? null);
                    setAllFieldsLoading(false);
                    showError(t('receipts.upload.analysis.failed'));
                } else {
                    // Schedule next poll with base interval (no errors)
                    pollingRef.current = setTimeout(pollAnalysisStatus, POLLING_INTERVAL_BASE);
                }
            } catch (e) {
                console.error('Failed to poll analysis status:', e);
                consecutiveErrorsRef.current += 1;

                if (consecutiveErrorsRef.current >= POLLING_MAX_ERRORS) {
                    // Stop polling after too many consecutive errors
                    console.warn(`Stopping polling after ${POLLING_MAX_ERRORS} consecutive errors`);
                    setAnalysisStatus('FAILED');
                    setAnalysisError(t('receipts.upload.analysis.serviceUnavailable'));
                    setAllFieldsLoading(false);
                    showError(t('receipts.upload.analysis.serviceUnavailable'));
                } else {
                    // Schedule next poll with exponential backoff
                    const nextInterval = getNextPollingInterval(consecutiveErrorsRef.current);
                    console.info(`Retrying poll in ${nextInterval}ms (attempt ${consecutiveErrorsRef.current}/${POLLING_MAX_ERRORS})`);
                    pollingRef.current = setTimeout(pollAnalysisStatus, nextInterval);
                }
            }
        };

        // Poll immediately on mount
        pollAnalysisStatus();

        return () => {
            if (pollingRef.current) {
                clearTimeout(pollingRef.current);
                pollingRef.current = null;
            }
        };
    }, [
        documentId,
        isAutoRead,
        isAnalyzing,
        setAnalysisStatus,
        setAnalysisError,
        applyAnalysisResult,
        setAllFieldsLoading,
        showSuccess,
        showError,
        t,
        getNextPollingInterval,
    ]);

    useEffect(() => {
        if (!store.organization?.id) return;
        loadBommels(store.organization.id).catch(() => {});
    }, [store.organization, loadBommels]);

    // Track if transaction has been loaded to prevent re-loading
    const transactionLoadedRef = useRef<string | null>(null);

    // Load transaction data in edit mode
    useEffect(() => {
        if (!id || !isEditMode) return;
        // Skip if already loaded for this ID
        if (transactionLoadedRef.current === id) return;

        // Mark as loaded immediately to prevent infinite loop on error
        transactionLoadedRef.current = id;

        const loadTransactionData = async () => {
            setIsLoadingTransaction(true);
            try {
                const transactionIdNum = parseInt(id, 10);
                const transaction = await apiService.orgService.transactionsGET(transactionIdNum);
                const loadedValues = loadTransaction(transaction);

                // Load document preview and check for analysis results if document exists
                if (transaction.documentId) {
                    // Fetch document to check analysis status
                    try {
                        const documentResponse = await apiService.orgService.documentsGET(transaction.documentId);

                        // If analysis is completed, apply results to empty fields only
                        if (documentResponse.analysisStatus === 'COMPLETED') {
                            const hasAppliedValues = applyAnalysisResultToEmptyFields(documentResponse, loadedValues);

                            // Show the AI banner if we applied any values
                            if (hasAppliedValues) {
                                setAnalysisStatus('COMPLETED');
                            }
                        }
                    } catch (docAnalysisError) {
                        console.warn('Could not fetch document analysis status:', docAnalysisError);
                    }

                    // Load document preview
                    try {
                        const orgBaseUrl = import.meta.env.VITE_API_ORG_URL;
                        const token = await import('@/services/auth/auth.service').then((m) => m.default.getAuthToken());
                        const response = await fetch(`${orgBaseUrl}/documents/${transaction.documentId}/file`, {
                            headers: {
                                Authorization: `Bearer ${token}`,
                            },
                        });
                        if (response.ok) {
                            const contentType = response.headers.get('Content-Type') || 'application/pdf';
                            setDocumentContentType(contentType);
                            const blob = await response.blob();
                            const url = URL.createObjectURL(blob);
                            setDocumentUrl(url);
                        }
                    } catch (docError) {
                        console.warn('Could not load document preview:', docError);
                    }
                }
            } catch (error) {
                console.error('Failed to load transaction:', error);
                showError(t('receipts.upload.loadFailed'));
            } finally {
                setIsLoadingTransaction(false);
            }
        };

        loadTransactionData();
    }, [id, isEditMode, loadTransaction, applyAnalysisResultToEmptyFields, setAnalysisStatus, showError, t]);

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

                // Track document and transaction IDs
                if (response.id) {
                    setDocumentId(response.id);
                    // Set transactionId from response (created by backend on upload)
                    if (response.transactionId) {
                        setTransactionId(response.transactionId);
                    }

                    if (isAutoRead) {
                        setAnalysisStatus(response.analysisStatus ?? 'PENDING');
                        setAnalysisError(null);
                    } else {
                        setFile(null);
                    }
                }
            } catch (e) {
                console.error(e);
                showError(t('receipts.upload.uploadFailed'));
                setAllFieldsLoading(false);
            } finally {
                setIsSubmitting(false);
            }
        },
        [
            isSubmitting,
            showError,
            showSuccess,
            isAutoRead,
            setFile,
            setIsSubmitting,
            setAllFieldsLoading,
            setDocumentId,
            setTransactionId,
            setAnalysisStatus,
            setAnalysisError,
            t,
        ]
    );

    // Build the update request payload for transaction
    const buildTransactionPayload = useCallback(() => {
        // Calculate total with sign based on transaction kind
        let total: number | undefined = undefined;
        if (netAmount) {
            const netValue = parseFloat(netAmount);
            const taxValue = parseFloat(taxAmount || '0');
            total = netValue + taxValue;
            // Make total negative for expenses
            if (transactionKind === 'expense' && total > 0) {
                total = -total;
            }
        }
        return {
            name: receiptNumber || undefined,
            total: total,
            totalTax: taxAmount ? parseFloat(taxAmount) : undefined,
            transactionDate: receiptDate?.toISOString().split('T')[0],
            dueDate: dueDate?.toISOString().split('T')[0],
            bommelId: bommelId ?? undefined,
            senderName: contractPartner || undefined,
            privatelyPaid: isUnpaid,
            area: area || undefined,
            categoryId: category ? parseInt(category, 10) : undefined,
            tags: tags.length > 0 ? tags : undefined,
        };
    }, [receiptNumber, receiptDate, dueDate, transactionKind, isUnpaid, contractPartner, bommelId, category, area, tags, netAmount, taxAmount]);

    // Submit handler - currently disabled, will be enabled when full validation passes
    const handleSubmit = useCallback(async () => {
        // Save button is disabled for now
        if (!isValid || !transactionId) {
            showError(t('common.validationError'));
            return;
        }

        try {
            setIsSubmitting(true);
            const payload = buildTransactionPayload();

            // Update transaction and confirm it
            await apiService.orgService.transactionsPATCH(transactionId, new TransactionUpdateRequest(payload));
            await apiService.orgService.confirm(transactionId);

            showSuccess(t('receipts.upload.saveSuccess'));
            resetForm();
            // Invalidate transactions query to refresh receipts list
            await queryClient.invalidateQueries({ queryKey: transactionKeys.all });
            navigate('/receipts');
        } catch (e) {
            console.error(e);
            showError(t('receipts.upload.saveFailed'));
        } finally {
            setIsSubmitting(false);
        }
    }, [isValid, transactionId, showError, showSuccess, resetForm, setIsSubmitting, t, buildTransactionPayload, navigate, queryClient]);

    // Save as draft - saves current form data to transaction without confirming
    const handleSaveDraft = useCallback(async () => {
        if (!canSaveDraft) {
            showError(t('receipts.upload.noDocumentOrFile'));
            return;
        }

        try {
            setIsSubmitting(true);
            const payload = buildTransactionPayload();

            if (transactionId) {
                // Update existing transaction
                await apiService.orgService.transactionsPATCH(transactionId, new TransactionUpdateRequest(payload));
                showSuccess(t('receipts.upload.draftSaved'));
            } else {
                // Create new manual transaction (no document)
                // For create, total is required
                const createPayload = {
                    ...payload,
                    total: payload.total ?? 0,
                };
                const response = await apiService.orgService.transactionsPOST(new TransactionCreateRequest(createPayload));
                if (response.id) {
                    setTransactionId(response.id);
                }
                showSuccess(t('receipts.upload.draftSaved'));
            }

            // Invalidate transactions query to refresh receipts list
            await queryClient.invalidateQueries({ queryKey: transactionKeys.all });
            // Navigate to receipts list after saving
            resetForm();
            navigate('/receipts');
        } catch (e) {
            console.error(e);
            showError(t('receipts.upload.saveFailed'));
        } finally {
            setIsSubmitting(false);
        }
    }, [canSaveDraft, transactionId, showError, showSuccess, setIsSubmitting, setTransactionId, t, buildTransactionPayload, resetForm, navigate, queryClient]);

    const handleCancel = useCallback(() => {
        navigate('/receipts');
    }, [navigate]);

    // Cleanup document URL on unmount
    useEffect(() => {
        return () => {
            if (documentUrl) {
                URL.revokeObjectURL(documentUrl);
            }
        };
    }, [documentUrl]);

    if (isLoadingTransaction) {
        return (
            <div className="flex flex-col gap-4">
                <h2 className="text-2xl font-semibold shrink-0">{t('receipts.upload.editTitle')}</h2>
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            <h2 className="text-2xl font-semibold shrink-0">{isEditMode ? t('receipts.upload.editTitle') : t('receipts.upload.title')}</h2>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:items-start">
                <div className="min-h-[300px] sm:min-h-[350px] md:self-stretch">
                    <InvoiceUploadFormDropzone
                        onFilesChanged={onFilesChanged}
                        previewFile={file}
                        previewUrl={documentUrl}
                        previewContentType={documentContentType}
                    />
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

                    <ReceiptFormActions
                        isValid={isValid}
                        canSaveDraft={canSaveDraft}
                        onSubmit={handleSubmit}
                        onSaveDraft={handleSaveDraft}
                        onCancel={handleCancel}
                        saveDisabled={true} // Save button disabled for now
                    />
                </div>
            </div>
        </div>
    );
}

export default ReceiptUploadView;
