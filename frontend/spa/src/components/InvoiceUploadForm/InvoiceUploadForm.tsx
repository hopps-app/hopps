import { FC, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileWithPath } from 'react-dropzone';
import { isEqual } from 'lodash';

import { useToast } from '@/hooks/use-toast.ts';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay.tsx';
import apiService from '@/services/ApiService.ts';
import InvoiceUploadFormDropzone from '@/components/InvoiceUploadForm/InvoiceUploadFormDropzone.tsx';
import List from '@/components/ui/List/List';
import InvoiceUploadFormBommelSelector from '@/components/InvoiceUploadForm/InvoiceUploadFormBommelSelector.tsx';
import { TransactionType, Transaction } from '@/services/api/types/TransactionRecord';
import { Checkbox } from '@/components/ui/shadecn/Checkbox';
import Select, { SelectItem } from '@/components/ui/Select';
import InvoiceUploadFormAction from '@/components/InvoiceUploadForm/InvoiceUploadFormAction';

type InvoiceUploadFormType = {
    onUploadInvoiceChange: () => void;
};

const InvoiceUploadForm: FC<InvoiceUploadFormType> = ({ onUploadInvoiceChange }) => {
    const { t } = useTranslation();
    const { showError, showSuccess } = useToast();

    const [selectedFiles, setSelectedFiles] = useState([] as FileWithPath[]);
    const [selectedBommelId, setSelectedBommelId] = useState(null as number | null);
    const [isUploading, setIsUploading] = useState(false);
    const [fileProgress, setFileProgress] = useState<Record<string, number>>({});
    const [isInvoicesQuantityLimit, setIsInvoicesQuantityLimit] = useState(false);
    const [isPrivatelyPaid, setIsPrivatelyPaid] = useState(false);
    const [documentType, setDocumentType] = useState<TransactionType>('');

    const transactionTypes: SelectItem[] = [
        {
            value: Transaction.INVOICE,
            label: t('invoiceUpload.invoice'),
        },
        {
            value: Transaction.RECEIPT,
            label: t('invoiceUpload.receipt'),
        },
    ];

    const onFilesChanged = useCallback(
        (newFiles: FileWithPath[]) => {
            if (!newFiles.length) return;

            const totalSize = [...selectedFiles, ...newFiles].reduce((acc, file) => acc + file.size, 0);
            const isDuplicate = selectedFiles.some((newFile) => newFiles.some((existingFile) => isEqual(existingFile.name, newFile.name)));

            if (totalSize > 20000000) {
                showError(t('invoiceUpload.totalTooLarge'));
                return;
            }

            if (isDuplicate) {
                showError('File already uploaded!');
                return;
            }

            const updatedProgress: Record<string, number> = { ...fileProgress };

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

            newFiles.forEach((file) => {
                simulateFileUpload(file);
            });

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
        },
        [fileProgress, selectedFiles]
    );

    const onBommelSelected = useCallback(
        (id: number | null) => {
            setSelectedBommelId(id);
        },
        [selectedBommelId]
    );
    const handleCheckboxChange = () => {
        setIsPrivatelyPaid((prev) => !prev);
    };

    const onDocumentTypeChange = (value: TransactionType) => {
        setDocumentType(value);
    };

    const isInvoiceSizeLimit = useMemo(() => selectedFiles.reduce((acc, current) => acc + current.size, 0) > 20000000, [selectedFiles]);

    useEffect(() => {
        if (isInvoiceSizeLimit) showError(t('invoiceUpload.totalTooLarge'));
        if (isInvoicesQuantityLimit) showError(t('invoiceUpload.maxFilesExceeded'));
    }, [isInvoiceSizeLimit, isInvoicesQuantityLimit]);

    const uploadInvoices = async () => {
        setIsUploading(true);
        try {
            if (selectedBommelId) {
                await Promise.all(selectedFiles.map((file) => apiService.invoices.uploadInvoice(file, selectedBommelId, documentType, isPrivatelyPaid)));
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

    const onClickRemoveSelected = (indexCurrent: number) => {
        const currentFiles = selectedFiles.filter((_, index) => index !== indexCurrent);

        setSelectedFiles(currentFiles);
    };

    const clearState = () => {
        setIsPrivatelyPaid(false);
        setDocumentType('');
        setSelectedFiles([]);
        setSelectedBommelId(null);
    };

    const isValidUpload = useMemo(() => {
        return isUploading || !selectedFiles.length || isInvoicesQuantityLimit || isInvoiceSizeLimit || !selectedBommelId || !documentType;
    }, [isUploading, selectedFiles, selectedBommelId, documentType]);

    return (
        <div className="invoice-upload-form flex flex-col gap-4">
            {isUploading && <LoadingOverlay />}
            <span className="font-normal text-md text-start">{t('invoiceUpload.title')}</span>
            <div className="md:flex flex-col gap-5 flex">
                <InvoiceUploadFormDropzone onFilesChanged={onFilesChanged} />
                <List
                    items={selectedFiles.map((file, index) => ({
                        title: file.name,
                        id: file.name + index,
                        progress: fileProgress[file.name] || 0,
                        icon: 'File',
                        iconSize: 'md',
                    }))}
                    isRemovableListItem={true}
                    className="gap-2"
                    onClickRemove={onClickRemoveSelected}
                />
                {isInvoiceSizeLimit && <p className="text-red-500  font-medium text-xs">{t('invoiceUpload.totalTooLarge')}</p>}
                {isInvoicesQuantityLimit && <p className="text-red-500  font-medium text-xs">{t('invoiceUpload.maxFilesExceeded')}</p>}
                <div className="flex gap-2 flex-col">
                    <div>{t('invoiceUpload.assign')}</div>
                    <div className="flex flex-col gap-8">
                        <InvoiceUploadFormBommelSelector onChange={onBommelSelected} />
                        <div className="flex flex-col gap-2">
                            <h6 className="text-sm font-medium">{t('invoiceUpload.docType')}</h6>
                            <Select className="h-16 rounded-2xl" value={documentType} onValueChanged={onDocumentTypeChange} items={transactionTypes} />
                        </div>
                        <div className="flex items-center space-x-2">
                            <Checkbox checked={isPrivatelyPaid} onCheckedChange={handleCheckboxChange} id="privatelyPaid" />
                            <label
                                htmlFor="privatelyPaid"
                                className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                                {t('invoiceUpload.privately')}
                            </label>
                        </div>
                    </div>
                </div>
            </div>

            <InvoiceUploadFormAction onCancel={onUploadInvoiceChange} onUpload={uploadInvoices} isValid={isValidUpload} />
        </div>
    );
};

export default InvoiceUploadForm;
