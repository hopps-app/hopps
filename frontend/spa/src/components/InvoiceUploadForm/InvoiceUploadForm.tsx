import { FC, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { DocumentType } from '@hopps/api-client';

import { useUploadForm } from '@/components/InvoiceUploadForm/hooks/useUploadForm';
import InvoiceUploadFormAction from '@/components/InvoiceUploadForm/InvoiceUploadFormAction';
import InvoiceUploadFormBommelSelector from '@/components/InvoiceUploadForm/InvoiceUploadFormBommelSelector.tsx';
import InvoiceUploadFormDropzone from '@/components/InvoiceUploadForm/InvoiceUploadFormDropzone.tsx';
import { InvoiceUploadType } from '@/components/InvoiceUploadForm/types/index';
import List from '@/components/ui/List/List';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay.tsx';
import Select, { SelectItem } from '@/components/ui/Select';
import { Checkbox } from '@/components/ui/shadecn/Checkbox';

const InvoiceUploadForm: FC<InvoiceUploadType> = ({ onUploadInvoiceChange }) => {
    const { t } = useTranslation();
    const {
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
        handleSubmit,
    } = useUploadForm({ onUploadInvoiceChange });

    const transactionTypes: SelectItem[] = [
        {
            value: DocumentType.INVOICE,
            label: t('invoiceUpload.invoice'),
        },
        {
            value: DocumentType.RECEIPT,
            label: t('invoiceUpload.receipt'),
        },
    ];

    return (
        <form onSubmit={handleSubmit} className="invoice-upload-form">
            {isUploading && <LoadingOverlay />}

            <div className="grid grid-cols-[1fr_2fr] gap-6 h-full">
                <div className="min-w-0 min-h-0 min-w-[400px]">
                    <InvoiceUploadFormDropzone onFilesChanged={onFilesChanged} />
                </div>

                <div className="min-w-0 min-h-0 min-w-[300px]">
                    <div className="min-h-0 flex-1 overflow-y-auto">
                        <List
                            items={selectedFiles.map((file, i) => ({
                                title: file.name,
                                id: file.name + i,
                                progress: fileProgress[file.name] || 0,
                                icon: 'File',
                                iconSize: 'md',
                            }))}
                            isRemovableListItem
                            className="gap-2"
                            onClickRemove={onClickRemoveSelected}
                        />
                    </div>

                    {isInvoiceSizeLimit && <p className="text-red-500 text-xs font-medium">{t('invoiceUpload.totalTooLarge')}</p>}
                    {isInvoicesQuantityLimit && <p className="text-red-500 text-xs font-medium">{t('invoiceUpload.maxFilesExceeded')}</p>}

                    <div className="flex flex-col gap-2">
                        <div>{t('invoiceUpload.assign')}</div>
                        <div className="flex flex-col gap-8">
                            <InvoiceUploadFormBommelSelector onChange={(a) => a && onBommelSelected(a)} />
                            {errors.bommelId && <p className="text-red-500 text-xs font-medium">{errors.bommelId.message}</p>}

                            <div className="flex flex-col gap-2">
                                <h6 className="text-sm font-medium">{t('invoiceUpload.docType')}</h6>
                                <Select className="h-16 rounded-2xl" value={documentType} onValueChanged={onDocumentTypeChange} items={transactionTypes} />
                                {errors.documentType && <p className="text-red-500 text-xs font-medium">{errors.documentType.message}</p>}
                            </div>

                            <div className="flex items-center space-x-2">
                                <Checkbox checked={isPrivatelyPaid} onCheckedChange={handleCheckboxChange} id="privatelyPaid" />
                                <label htmlFor="privatelyPaid" className="text-xs font-medium leading-none">
                                    {t('invoiceUpload.privately')}
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <InvoiceUploadFormAction onCancel={onUploadInvoiceChange} isValid={isValidUpload} />
        </form>
    );
};

export default memo(InvoiceUploadForm);
