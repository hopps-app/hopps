import { zodResolver } from '@hookform/resolvers/zod';
import type { DocumentType } from '@hopps/api-client';
import { isEqual } from 'lodash';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FileWithPath } from 'react-dropzone';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { InvoiceUploadType } from '@/components/InvoiceUploadForm/types';
import { useToast } from '@/hooks/use-toast.ts';
import apiService from '@/services/ApiService.ts';

// Polling interval in milliseconds
const POLL_INTERVAL = 2000;

// Analysis status types (should match backend AnalysisStatus enum)
type AnalysisStatus = 'PENDING' | 'ANALYZING' | 'COMPLETED' | 'FAILED' | 'SKIPPED';

interface UploadedDocument {
    id: number;
    analysisStatus: AnalysisStatus;
    analysisError?: string;
    // Analysis results
    name?: string;
    total?: number;
    currencyCode?: string;
    transactionTime?: string;
    senderName?: string;
    tags?: string[];
}

export function useUploadForm({ onUploadInvoiceChange }: InvoiceUploadType) {
    const { showError, showSuccess, showWarning } = useToast();

    const [selectedFiles, setSelectedFiles] = useState<FileWithPath[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [fileProgress, setFileProgress] = useState<Record<string, number>>({});
    const [isInvoicesQuantityLimit, setIsInvoicesQuantityLimit] = useState(false);
    const [uploadedDocuments, setUploadedDocuments] = useState<UploadedDocument[]>([]);
    const [isPolling, setIsPolling] = useState(false);

    // Keep track of polling intervals
    const pollingIntervals = useRef<Map<number, NodeJS.Timeout>>(new Map());

    const invoiceUploadSchema = z.object({
        bommelId: z.number().refine((val) => val !== null, {
            message: 'Please select a Bommel',
        }),
        documentType: z.string().refine((val) => ['INVOICE', 'RECEIPT'].includes(val), {
            message: 'Please select a document type',
        }),
        isPrivatelyPaid: z.boolean(),
    });

    type InvoiceUploadFormFields = z.infer<typeof invoiceUploadSchema>;

    const defaultValues: InvoiceUploadFormFields = {
        bommelId: 0 as number,
        documentType: '',
        isPrivatelyPaid: false,
    };

    const {
        setValue,
        watch,
        handleSubmit,
        formState: { errors },
    } = useForm<InvoiceUploadFormFields>({
        resolver: zodResolver(invoiceUploadSchema),
        defaultValues,
    });

    const selectedBommelId = watch('bommelId');
    const isPrivatelyPaid = watch('isPrivatelyPaid');
    const documentType = watch('documentType');

    const isInvoiceSizeLimit = useMemo(() => selectedFiles.reduce((acc, current) => acc + current.size, 0) > 20000000, [selectedFiles]);

    useEffect(() => {
        if (isInvoiceSizeLimit) showError('Total size too large');
        if (isInvoicesQuantityLimit) showError('Max number of files exceeded');
    }, [isInvoiceSizeLimit, isInvoicesQuantityLimit, showError]);

    useEffect(() => {
        if (selectedFiles.length < 10) {
            setIsInvoicesQuantityLimit(false);
        }
    }, [selectedFiles]);

    // Cleanup polling intervals on unmount
    useEffect(() => {
        const intervals = pollingIntervals.current;
        return () => {
            intervals.forEach((interval) => clearInterval(interval));
            intervals.clear();
        };
    }, []);

    const updateFileProgress = (fileName: string, progress: number) => {
        setFileProgress((prev) => ({
            ...prev,
            [fileName]: progress,
        }));
    };

    const finalizeFileProgress = (fileName: string) => {
        setTimeout(() => {
            setFileProgress((prev) => ({
                ...prev,
                [fileName]: 100,
            }));
        }, 500);
    };

    const simulateFileUpload = (file: FileWithPath) => {
        let progress = 0;
        const interval = setInterval(() => {
            progress += 20;
            updateFileProgress(file.name, progress);
            if (progress >= 100) {
                clearInterval(interval);
                finalizeFileProgress(file.name);
            }
        }, 100);
    };

    const onFileUploadValidation = useCallback(
        (newFiles: FileWithPath[]): boolean => {
            const totalSize = [...selectedFiles, ...newFiles].reduce((acc, file) => acc + file.size, 0);
            const isDuplicate = selectedFiles.some((newFile) => newFiles.some((existingFile) => isEqual(existingFile.name, newFile.name)));

            if (totalSize > 20000000) {
                showError('Total size too large');
                return false;
            }

            if (isDuplicate) {
                showError('File already uploaded!');
                return false;
            }

            return true;
        },
        [selectedFiles, showError]
    );

    const simulateFileUploadCb = useCallback((file: FileWithPath) => {
        simulateFileUpload(file);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const onFilesChanged = useCallback(
        (newFiles: FileWithPath[]) => {
            if (!newFiles.length) return;

            if (!onFileUploadValidation(newFiles)) return;

            setFileProgress((prev) => {
                const updatedProgress = { ...prev };
                newFiles.forEach((file) => {
                    updatedProgress[file.name] = 0;
                });
                return updatedProgress;
            });

            setSelectedFiles((prev) => {
                if (prev.length < 10) {
                    return [...prev, ...newFiles];
                } else {
                    setIsInvoicesQuantityLimit(true);
                    return prev;
                }
            });

            newFiles.forEach(simulateFileUploadCb);
        },
        [onFileUploadValidation, simulateFileUploadCb]
    );

    /**
     * Starts polling for analysis status of a document
     */
    const startPolling = (docId: number) => {
        setIsPolling(true);

        const interval = setInterval(async () => {
            try {
                // Fetch document status
                // Note: Method name will be updated after API client regeneration
                const doc = await apiService.orgService.documentsGET(docId);

                // Update the document in our state
                setUploadedDocuments((prev) => prev.map((d) => (d.id === docId ? { ...d, ...doc } : d)));

                // Check if analysis is complete
                if (doc.analysisStatus === 'COMPLETED') {
                    clearInterval(interval);
                    pollingIntervals.current.delete(docId);

                    // Check if all documents are done
                    const allDone = pollingIntervals.current.size === 0;
                    if (allDone) {
                        setIsPolling(false);
                        showSuccess('Analysis completed for all documents');
                        onUploadInvoiceChange();
                    }
                } else if (doc.analysisStatus === 'FAILED') {
                    clearInterval(interval);
                    pollingIntervals.current.delete(docId);

                    showWarning(`Analysis failed for document: ${doc.analysisError || 'Unknown error'}`);

                    // Check if all documents are done
                    const allDone = pollingIntervals.current.size === 0;
                    if (allDone) {
                        setIsPolling(false);
                    }
                } else if (doc.analysisStatus === 'SKIPPED') {
                    clearInterval(interval);
                    pollingIntervals.current.delete(docId);

                    // Check if all documents are done
                    const allDone = pollingIntervals.current.size === 0;
                    if (allDone) {
                        setIsPolling(false);
                        showSuccess('Upload completed');
                        onUploadInvoiceChange();
                    }
                }
            } catch (e) {
                console.error('Error polling document status:', e);
                // Don't stop polling on error, might be transient
            }
        }, POLL_INTERVAL);

        pollingIntervals.current.set(docId, interval);
    };

    const uploadInvoices = async () => {
        setIsUploading(true);
        try {
            if (selectedBommelId) {
                // Upload all files
                const uploadResults = await Promise.all(
                    selectedFiles.map((file) =>
                        // Note: Method name will be updated after API client regeneration
                        apiService.orgService.documentsPOST(
                            {
                                data: file,
                                fileName: file.name,
                            },
                            selectedBommelId,
                            isPrivatelyPaid,
                            documentType as DocumentType
                        )
                    )
                );

                // Store uploaded documents
                setUploadedDocuments(uploadResults as UploadedDocument[]);

                // Start polling for each uploaded document
                uploadResults.forEach((doc: UploadedDocument) => {
                    if (doc.id) {
                        startPolling(doc.id);
                    }
                });

                showSuccess('Files uploaded, analysis in progress...');
                setSelectedFiles([]);
                setValue('documentType', '');
                setValue('bommelId', 0);
                setValue('isPrivatelyPaid', false);
            }
        } catch (e) {
            console.error(e);
            showError('Failed to upload invoices');
        } finally {
            setIsUploading(false);
        }
    };

    const onClickRemoveSelected = (index: number) => {
        const updated = selectedFiles.filter((_, i) => i !== index);
        setSelectedFiles(updated);
    };

    const onBommelSelected = useCallback(
        (id: number | null) => {
            setValue('bommelId', id as InvoiceUploadFormFields['bommelId']);
        },
        [setValue]
    );
    const handleCheckboxChange = () => {
        setValue('isPrivatelyPaid', !isPrivatelyPaid);
    };

    const onDocumentTypeChange = (value: string) => {
        console.log(value);
        setValue('documentType', value as DocumentType);
    };

    const isValidUpload = useMemo(
        () => isUploading || isPolling || !selectedFiles.length || isInvoicesQuantityLimit || isInvoiceSizeLimit || !selectedBommelId || !documentType,
        [isUploading, isPolling, selectedFiles, isInvoicesQuantityLimit, isInvoiceSizeLimit, selectedBommelId, documentType]
    );

    return {
        selectedFiles,
        isUploading,
        isPolling,
        uploadedDocuments,
        fileProgress,
        isInvoicesQuantityLimit,
        isPrivatelyPaid,
        documentType,
        onFilesChanged,
        onBommelSelected,
        handleCheckboxChange,
        onDocumentTypeChange,
        onClickRemoveSelected,
        isValidUpload,
        isInvoiceSizeLimit,
        errors,
        handleSubmit: handleSubmit(uploadInvoices),
    };
}
