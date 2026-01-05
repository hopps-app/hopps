import { zodResolver } from '@hookform/resolvers/zod';
import { isEqual } from 'lodash';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FileWithPath } from 'react-dropzone';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import type { DocumentType } from '@hopps/api-client';

import { InvoiceUploadType } from '@/components/InvoiceUploadForm/types/index';
import { useToast } from '@/hooks/use-toast.ts';
import apiService from '@/services/ApiService.ts';

export function useUploadForm({ onUploadInvoiceChange }: InvoiceUploadType) {
    const { showError, showSuccess } = useToast();

    const [selectedFiles, setSelectedFiles] = useState<FileWithPath[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [fileProgress, setFileProgress] = useState<Record<string, number>>({});
    const [isInvoicesQuantityLimit, setIsInvoicesQuantityLimit] = useState(false);

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
    }, [isInvoiceSizeLimit, isInvoicesQuantityLimit]);

    useEffect(() => {
        if (selectedFiles.length < 10) {
            setIsInvoicesQuantityLimit(false);
        }
    }, [selectedFiles]);

    const clearState = () => {
        setSelectedFiles([]);
        setValue('documentType', '');
        setValue('bommelId', 0);
        setValue('isPrivatelyPaid', false);
    };

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

    const onFileUploadValidation = (newFiles: FileWithPath[]): boolean => {
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
    };

    const onFilesChanged = useCallback(
        (newFiles: FileWithPath[]) => {
            if (!newFiles.length) return;

            if (!onFileUploadValidation(newFiles)) return;

            const updatedProgress = { ...fileProgress };
            newFiles.forEach((file) => {
                updatedProgress[file.name] = 0;
            });

            setFileProgress(updatedProgress);

            setSelectedFiles((prev) => {
                if (prev.length < 10) {
                    return [...prev, ...newFiles];
                } else {
                    setIsInvoicesQuantityLimit(true);
                    return prev;
                }
            });

            newFiles.forEach(simulateFileUpload);
        },
        [fileProgress, selectedFiles]
    );

    const uploadInvoices = async () => {
        setIsUploading(true);
        try {
            if (selectedBommelId) {
                await Promise.all(
                    selectedFiles.map((file) =>
                        apiService.orgService.documentPOST(
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
            }
            showSuccess('All files uploaded successfully');
            clearState();
            onUploadInvoiceChange();
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
        [selectedBommelId]
    );
    const handleCheckboxChange = () => {
        setValue('isPrivatelyPaid', !isPrivatelyPaid);
    };

    const onDocumentTypeChange = (value: string) => {
        console.log(value);
        setValue('documentType', value as DocumentType);
    };

    const isValidUpload = useMemo(
        () => isUploading || !selectedFiles.length || isInvoicesQuantityLimit || isInvoiceSizeLimit || !selectedBommelId || !documentType,
        [isUploading, selectedFiles, isInvoicesQuantityLimit, isInvoiceSizeLimit, selectedBommelId, documentType]
    );

    return {
        selectedFiles,
        isUploading,
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
