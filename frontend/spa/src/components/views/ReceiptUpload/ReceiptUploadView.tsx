import type { AnalysisStatus } from '@hopps/api-client';
import { OrganizationInput, TransactionCreateRequest, TransactionUpdateRequest } from '@hopps/api-client';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Download } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

import { ReceiptDetailFields, ReceiptFormActions, ReceiptFormFields } from './components';
import { useReceiptForm } from './hooks';

import InvoiceUploadFormDropzone from '@/components/InvoiceUploadForm/InvoiceUploadFormDropzone';
import Button from '@/components/ui/Button';
import Switch from '@/components/ui/Switch';
import { transactionKeys } from '@/hooks/queries/useTransactions';
import { usePageTitle } from '@/hooks/use-page-title';
import { useToast } from '@/hooks/use-toast';
import { useUnsavedChangesWarning } from '@/hooks/use-unsaved-changes-warning';
import apiService from '@/services/ApiService';
import { useBommelsStore } from '@/store/bommels/bommelsStore';
import { useStore } from '@/store/store';

const POLLING_INTERVAL_BASE = 2000; // 2 seconds base interval
const POLLING_MAX_INTERVAL = 30000; // 30 seconds max interval
const POLLING_MAX_ERRORS = 5; // Stop polling after 5 consecutive errors
const POLLING_MAX_DURATION = 2 * 60 * 1000; // 2 minutes max polling duration

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
    // Page title set after isReadOnly state is defined below
    const { showError, showSuccess } = useToast();
    const { loadBommels, rootBommel } = useBommelsStore();
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
        grossAmount,
        setGrossAmount,
        taxAmount,
        setTaxAmount,
        isSubmitting,
        setIsSubmitting,
        isAutoRead,
        setIsAutoRead,
        loadingStates,
        setAllFieldsLoading,
        setEmptyFieldsLoading,
        setFieldLoading,
        resetForm,
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
        formErrors,
        validate,
        validateDraft,
        clearFieldError,
        applyAnalysisResult,
        applyAnalysisResultToEmptyFields,
        loadTransaction,
        isDirty,
    } = useReceiptForm();

    // Read-only mode for confirmed receipts
    const [isReadOnly, setIsReadOnly] = useState(false);

    const handleEdit = useCallback(() => {
        setIsReadOnly(false);
    }, []);

    usePageTitle(isReadOnly ? t('receipts.upload.viewTitle') : id ? t('receipts.upload.editTitle') : t('receipts.upload.title'));

    // Warn user when navigating away with unsaved changes
    useUnsavedChangesWarning(isDirty);

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

    // Load organization auto-analyze setting
    const autoReadLoadedRef = useRef(false);
    useEffect(() => {
        if (autoReadLoadedRef.current) return;
        autoReadLoadedRef.current = true;

        apiService.orgService
            .myGET()
            .then((org) => {
                if (org.autoAnalyzeDocuments !== undefined) {
                    setIsAutoRead(org.autoAnalyzeDocuments);
                }
            })
            .catch((e) => {
                console.error('Failed to load organization settings:', e);
            });
    }, [setIsAutoRead]);

    useEffect(() => {
        if (!store.organization?.id) return;
        loadBommels(store.organization.id).catch(() => {});
    }, [store.organization, loadBommels]);

    // Set root bommel as default for new receipts
    useEffect(() => {
        if (!isEditMode && rootBommel?.id && !bommelId) {
            setBommelId(rootBommel.id);
        }
    }, [isEditMode, rootBommel, bommelId, setBommelId]);

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

                // Set read-only for confirmed receipts
                if (transaction.status === 'CONFIRMED') {
                    setIsReadOnly(true);
                }

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
                        } else if (documentResponse.analysisStatus === 'FAILED') {
                            // Restore failed analysis state so the error banner is shown
                            setAnalysisStatus('FAILED');
                            setAnalysisError(documentResponse.analysisError ?? null);
                        } else if (documentResponse.analysisStatus === 'PENDING' || documentResponse.analysisStatus === 'ANALYZING') {
                            // Analysis still in progress - resume polling
                            setAnalysisStatus(documentResponse.analysisStatus as AnalysisStatus);
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
    }, [id, isEditMode, loadTransaction, applyAnalysisResultToEmptyFields, setAnalysisStatus, setAnalysisError, showError, t]);

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
                    setEmptyFieldsLoading(true);
                }

                const response = await apiService.orgService.documentsPOST(isAutoRead, {
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
            setEmptyFieldsLoading,
            setDocumentId,
            setTransactionId,
            setAnalysisStatus,
            setAnalysisError,
            t,
        ]
    );

    // Build the update request payload for transaction
    const buildTransactionPayload = useCallback(() => {
        // Gross amount is the total (including tax)
        let total: number | undefined = undefined;
        if (grossAmount) {
            total = parseFloat(grossAmount);
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
            bommelId: bommelId ?? 0,
            senderName: contractPartner || undefined,
            privatelyPaid: isUnpaid,
            area: area || undefined,
            categoryId: category ? parseInt(category, 10) : undefined,
            tags: tags.length > 0 ? tags : undefined,
        };
    }, [receiptNumber, receiptDate, dueDate, transactionKind, isUnpaid, contractPartner, bommelId, category, area, tags, grossAmount, taxAmount]);

    // Field change handlers that clear validation errors
    const handleReceiptDateChange = useCallback(
        (date: Date | undefined) => {
            setReceiptDate(date);
            setFieldLoading('receiptDate', !date && isAnalyzing);
            clearFieldError('receiptDate');
        },
        [setReceiptDate, setFieldLoading, isAnalyzing, clearFieldError]
    );

    const handleTransactionKindChange = useCallback(
        (value: 'intake' | 'expense' | '') => {
            setTransactionKind(value);
            clearFieldError('transactionKind');
        },
        [setTransactionKind, clearFieldError]
    );

    const handleContractPartnerChange = useCallback(
        (value: string) => {
            setContractPartner(value);
            setFieldLoading('contractPartner', !value && isAnalyzing);
            clearFieldError('contractPartner');
        },
        [setContractPartner, setFieldLoading, isAnalyzing, clearFieldError]
    );

    const handleBommelIdChange = useCallback(
        (id: number | null) => {
            setBommelId(id);
            clearFieldError('bommelId');
        },
        [setBommelId, clearFieldError]
    );

    const handleGrossAmountChange = useCallback(
        (value: string) => {
            setGrossAmount(value);
            setFieldLoading('grossAmount', !value && isAnalyzing);
            clearFieldError('grossAmount');
        },
        [setGrossAmount, setFieldLoading, isAnalyzing, clearFieldError]
    );

    const handleTaxAmountChange = useCallback(
        (value: string) => {
            setTaxAmount(value);
            setFieldLoading('taxAmount', !value && isAnalyzing);
            clearFieldError('taxAmount');
        },
        [setTaxAmount, setFieldLoading, isAnalyzing, clearFieldError]
    );

    const handleReceiptNumberChange = useCallback(
        (value: string) => {
            setReceiptNumber(value);
            setFieldLoading('receiptNumber', !value && isAnalyzing);
            clearFieldError('receiptNumber');
        },
        [setReceiptNumber, setFieldLoading, isAnalyzing, clearFieldError]
    );

    const handleAreaChange = useCallback(
        (value: string) => {
            setArea(value);
            clearFieldError('area');
        },
        [setArea, clearFieldError]
    );

    // Submit handler - validates and scrolls to first error if invalid
    const handleSubmit = useCallback(async () => {
        if (!validate()) {
            showError(t('common.validationError'));
            // Scroll to first validation error
            requestAnimationFrame(() => {
                const firstError = document.querySelector('[role="alert"]');
                firstError?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            });
            return;
        }
        if (!transactionId) {
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
    }, [validate, transactionId, showError, showSuccess, resetForm, setIsSubmitting, t, buildTransactionPayload, navigate, queryClient]);

    // Save as draft - saves current form data to transaction without confirming
    const handleSaveDraft = useCallback(async () => {
        if (!canSaveDraft) {
            showError(t('receipts.upload.noDocumentOrFile'));
            return;
        }

        if (!validateDraft()) {
            showError(t('common.validationError'));
            return;
        }

        try {
            setIsSubmitting(true);
            const payload = buildTransactionPayload();

            if (transactionId) {
                // Update existing transaction and ensure status is DRAFT
                await apiService.orgService.transactionsPATCH(transactionId, new TransactionUpdateRequest({ ...payload, status: 'DRAFT' }));
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
    }, [
        canSaveDraft,
        validateDraft,
        transactionId,
        showError,
        showSuccess,
        setIsSubmitting,
        setTransactionId,
        t,
        buildTransactionPayload,
        resetForm,
        navigate,
        queryClient,
    ]);

    const handleCancel = useCallback(() => {
        navigate('/receipts');
    }, [navigate]);

    // Download document file from S3/MinIO
    const handleDownloadDocument = useCallback(async () => {
        if (!documentId) return;
        try {
            const orgBaseUrl = import.meta.env.VITE_API_ORG_URL;
            const token = await import('@/services/auth/auth.service').then((m) => m.default.getAuthToken());
            const response = await fetch(`${orgBaseUrl}/documents/${documentId}/file`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            if (!response.ok) {
                throw new Error(`Download failed: ${response.status}`);
            }
            const blob = await response.blob();
            // Extract filename from Content-Disposition header or use default
            const contentDisposition = response.headers.get('Content-Disposition');
            let fileName = 'document';
            if (contentDisposition) {
                const match = contentDisposition.match(/filename="?([^";\n]+)"?/);
                if (match?.[1]) {
                    fileName = match[1];
                }
            }
            // Create a temporary link and trigger download
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (e) {
            console.error('Document download failed:', e);
            showError(t('receipts.downloadFailed'));
        }
    }, [documentId, showError, t]);

    // Retry analysis for a failed document
    const handleRetryAnalysis = useCallback(async () => {
        if (!documentId) return;
        try {
            setAnalysisStatus('PENDING');
            setAnalysisError(null);
            setEmptyFieldsLoading(true);

            const response = await apiService.orgService.reanalyze(documentId);
            setAnalysisStatus((response.analysisStatus as AnalysisStatus) ?? 'PENDING');
        } catch (e) {
            console.error('Failed to retry analysis:', e);
            setAnalysisStatus('FAILED');
            setAnalysisError(t('receipts.upload.analysis.serviceUnavailable'));
            setAllFieldsLoading(false);
            showError(t('receipts.upload.analysis.retryFailed'));
        }
    }, [documentId, setAnalysisStatus, setAnalysisError, setEmptyFieldsLoading, setAllFieldsLoading, showError, t]);

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
            <div className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-muted-foreground/20 border-t-primary"></div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            <div className="flex-1 grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-2 md:grid-rows-[1fr_auto]">
                {/* Preview (row 1, col 1) */}
                <div className="min-h-[400px] md:min-h-0 relative md:col-start-1 md:row-start-1">
                    <div className="h-full md:absolute md:inset-0">
                        <InvoiceUploadFormDropzone
                            onFilesChanged={onFilesChanged}
                            previewFile={file}
                            previewUrl={documentUrl}
                            previewContentType={documentContentType}
                        />
                    </div>
                </div>

                {/* Left buttons (row 2, col 1) */}
                <div className="flex items-center gap-3 md:col-start-1 md:row-start-2">
                    {!isReadOnly && (
                        <Switch
                            checked={isAutoRead}
                            onCheckedChange={(checked) => {
                                setIsAutoRead(checked);
                                apiService.orgService.myPUT(new OrganizationInput({ autoAnalyzeDocuments: checked })).catch((e: unknown) => {
                                    console.error('Failed to save auto-analyze setting:', e);
                                });
                                if (checked && documentId) {
                                    if (!analysisStatus) {
                                        // No analysis started yet — trigger it
                                        handleRetryAnalysis();
                                    } else if (analysisStatus === 'PENDING' || analysisStatus === 'ANALYZING') {
                                        // Analysis still running — re-enable loading spinners, polling resumes via useEffect
                                        setEmptyFieldsLoading(true);
                                    } else if (analysisStatus === 'COMPLETED') {
                                        // Analysis already finished — fetch and apply results now
                                        setEmptyFieldsLoading(true);
                                        apiService.orgService
                                            .documentsGET(documentId)
                                            .then((response) => {
                                                applyAnalysisResult(response);
                                            })
                                            .catch((e: unknown) => {
                                                console.error('Failed to fetch completed analysis:', e);
                                                setAllFieldsLoading(false);
                                            });
                                    }
                                } else if (!checked) {
                                    // Stop loading animations when disabling auto-read
                                    setAllFieldsLoading(false);
                                }
                            }}
                            label={t('receipts.upload.autoRead')}
                        />
                    )}
                    <div className="flex-1" />
                    {documentId && (
                        <Button type="button" variant="outline" onClick={handleDownloadDocument} className="flex items-center justify-center gap-2">
                            <Download className="w-4 h-4" />
                            {t('receipts.downloadDocument')}
                        </Button>
                    )}
                </div>

                {/* Attributes (row 1, col 2) */}
                <div className="flex flex-col gap-4 md:col-start-2 md:row-start-1">
                    {/* AI Warning Banner */}
                    {isAutoRead && (
                        <div className="flex items-start gap-3 p-3 2xl:p-5 rounded-xl border text-sm bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950 dark:border-amber-800 dark:text-amber-200">
                            <AlertTriangle className="h-4 w-4 2xl:h-5 2xl:w-5 shrink-0 mt-0.5" />
                            <p className="text-xs 2xl:text-sm">{t('receipts.upload.analysis.aiWarning')}</p>
                        </div>
                    )}

                    {/* Analysis Status Banner */}
                    {analysisStatus && (isAutoRead || analysisStatus === 'FAILED') && (
                        <div
                            className={`flex items-start gap-3 p-4 rounded-xl border text-sm ${
                                analysisStatus === 'COMPLETED'
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-200'
                                    : analysisStatus === 'FAILED'
                                      ? 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950 dark:border-red-800 dark:text-red-200'
                                      : 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-200'
                            }`}
                        >
                            <div className="shrink-0 mt-0.5">
                                {isAnalyzing ? (
                                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path
                                            className="opacity-75"
                                            fill="currentColor"
                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                        ></path>
                                    </svg>
                                ) : analysisStatus === 'COMPLETED' ? (
                                    <svg
                                        className="h-4 w-4"
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                        <polyline points="22 4 12 14.01 9 11.01" />
                                    </svg>
                                ) : (
                                    <svg
                                        className="h-4 w-4"
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <circle cx="12" cy="12" r="10" />
                                        <line x1="15" y1="9" x2="9" y2="15" />
                                        <line x1="9" y1="9" x2="15" y2="15" />
                                    </svg>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-medium leading-tight">
                                    {analysisStatus === 'PENDING' && t('receipts.upload.analysis.pending')}
                                    {analysisStatus === 'ANALYZING' && t('receipts.upload.analysis.analyzing')}
                                    {analysisStatus === 'COMPLETED' && t('receipts.upload.analysis.completed')}
                                    {analysisStatus === 'FAILED' && t('receipts.upload.analysis.failed')}
                                </p>
                                {analysisStatus === 'COMPLETED' && (
                                    <div className="mt-1.5 space-y-0.5">
                                        <p className="text-xs opacity-80">{t('receipts.upload.analysis.completedDescription')}</p>
                                        <p className="text-xs font-medium">
                                            {extractionSource === 'ZUGFERD'
                                                ? t('receipts.upload.analysis.extractedViaZugferd')
                                                : t('receipts.upload.analysis.extractedViaDocumentAI')}
                                        </p>
                                    </div>
                                )}
                                {analysisStatus === 'FAILED' && (
                                    <div className="mt-1.5 space-y-1.5">
                                        {analysisError && (
                                            <p className="text-xs opacity-80">{t('receipts.upload.analysis.errorDetail', { error: analysisError })}</p>
                                        )}
                                        {documentId && (
                                            <button type="button" onClick={handleRetryAnalysis} className="text-xs font-medium underline hover:no-underline">
                                                {t('receipts.upload.analysis.retry')}
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <div
                        className={`h-full min-w-0 rounded-[30px] p-5 2xl:p-8 shadow-md ${isReadOnly ? 'bg-white p-8 2xl:p-10' : 'bg-card border border-[#A7A7A7]'}`}
                    >
                        {isReadOnly ? (
                            <ReceiptDetailFields
                                receiptNumber={receiptNumber}
                                receiptDate={receiptDate}
                                dueDate={dueDate}
                                transactionKind={transactionKind}
                                isUnpaid={isUnpaid}
                                contractPartner={contractPartner}
                                bommelId={bommelId}
                                category={category}
                                area={area}
                                tags={tags}
                                grossAmount={grossAmount}
                                taxAmount={taxAmount}
                            />
                        ) : (
                            <ReceiptFormFields
                                receiptNumber={receiptNumber}
                                onReceiptNumberChange={handleReceiptNumberChange}
                                receiptDate={receiptDate}
                                onReceiptDateChange={handleReceiptDateChange}
                                dueDate={dueDate}
                                onDueDateChange={setDueDate}
                                transactionKind={transactionKind}
                                onTransactionKindChange={handleTransactionKindChange}
                                isUnpaid={isUnpaid}
                                onIsUnpaidChange={setIsUnpaid}
                                contractPartner={contractPartner}
                                onContractPartnerChange={handleContractPartnerChange}
                                bommelId={bommelId}
                                onBommelIdChange={handleBommelIdChange}
                                category={category}
                                onCategoryChange={setCategory}
                                area={area}
                                onAreaChange={handleAreaChange}
                                tags={tags}
                                onTagsChange={setTags}
                                grossAmount={grossAmount}
                                onGrossAmountChange={handleGrossAmountChange}
                                taxAmount={taxAmount}
                                onTaxAmountChange={handleTaxAmountChange}
                                loadingStates={loadingStates}
                                errors={formErrors}
                            />
                        )}
                    </div>
                </div>

                {/* Right buttons (row 2, col 2) */}
                <div className="flex items-center justify-end md:col-start-2 md:row-start-2 mb-2">
                    <ReceiptFormActions
                        canSaveDraft={canSaveDraft}
                        onSubmit={handleSubmit}
                        onSaveDraft={handleSaveDraft}
                        onCancel={handleCancel}
                        readOnly={isReadOnly}
                        onEdit={handleEdit}
                    />
                </div>
            </div>
        </div>
    );
}

export default ReceiptUploadView;
