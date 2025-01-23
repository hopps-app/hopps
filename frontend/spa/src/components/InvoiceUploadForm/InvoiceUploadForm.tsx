import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileWithPath } from 'react-dropzone';

import Button from '@/components/ui/Button.tsx';
import { useToast } from '@/hooks/use-toast.ts';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay.tsx';
import apiService from '@/services/ApiService.ts';
import { useStore } from '@/store/store.ts';
import InvoiceUploadFormDropzone from '@/components/InvoiceUploadForm/InvoiceUploadFormDropzone.tsx';
import InvoiceUploadFormBommelSelector from '@/components/InvoiceUploadForm/InvoiceUploadFormBommelSelector.tsx';

const InvoiceUploadForm: React.FC = () => {
    const { t } = useTranslation();
    const { showError, showSuccess } = useToast();
    const store = useStore();

    const [selectedFiles, setSelectedFiles] = useState([] as FileWithPath[]);
    const [selectedBommelId, setSelectedBommelId] = useState(null as number | null);
    const [isUploading, setIsUploading] = useState(false);

    const onFilesChanged = useCallback((files: FileWithPath[]) => {
        setSelectedFiles(files);
    }, []);

    const onBommelSelected = useCallback((id: number) => {
        setSelectedBommelId(id);
    }, []);

    const onClickUpload = useCallback(() => {
        if (!selectedFiles.length) {
            showError('Select a file to be uploaded');
            return;
        }
        if (!selectedBommelId) {
            showError('Select a Bommel');
            return;
        }

        uploadInvoice(selectedFiles[0], selectedBommelId || store.organization?.rootBommel?.id || 0);
    }, [selectedFiles, selectedBommelId]);

    const uploadInvoice = useCallback(async (file: File, bommelId: number) => {
        setIsUploading(true);

        console.log('UPLOAD INVOICE', file, bommelId);

        try {
            await apiService.invoices.uploadInvoice(file, bommelId);
            showSuccess('File uploaded successfully');
        } catch (e) {
            console.error(e);
            showError('Failed to upload invoice');
        }

        setIsUploading(false);
    }, []);

    return (
        <div className="invoice-upload-form flex flex-col gap-4">
            {isUploading && <LoadingOverlay />}
            <div>
                <h1 className="font-normal text-5xl text-center">{t('invoiceUpload.title')}:</h1>
            </div>
            <div className="flex-row md:flex">
                <div className="flex-shrink-0 flex-grow-0 basis-1/2 pr-2">
                    <div>Select Bommel:</div>
                    <InvoiceUploadFormBommelSelector onChange={onBommelSelected} className="md:max-h-72 overflow-auto" />
                </div>

                <div className="flex-shrink-0 flex-grow-0 basis-1/2 pl-2">
                    <div>Select file:</div>
                    <InvoiceUploadFormDropzone onFilesChanged={onFilesChanged} />
                </div>
            </div>

            <div className="flex flex-row gap-4 justify-center">
                <Button onClick={onClickUpload} disabled={isUploading || !selectedFiles.length}>
                    {t('common.upload')}
                </Button>
            </div>
        </div>
    );
};

export default InvoiceUploadForm;
