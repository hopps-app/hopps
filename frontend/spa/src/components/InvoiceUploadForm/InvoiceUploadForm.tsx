import { FC, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Transaction } from '@hopps/api-client';

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
            value: Transaction.INVOICE,
            label: t('invoiceUpload.invoice'),
        },
        {
            value: Transaction.RECEIPT,
            label: t('invoiceUpload.receipt'),
        },
    ];

    return (
        <form onSubmit={handleSubmit} className="invoice-upload-form flex flex-col gap-4">
            {isUploading && <LoadingOverlay />}
            <span className="font-normal text-md text-start">{t('invoiceUpload.title')}</span>
            <div className="md:flex flex-row gap-5 flex">
                <InvoiceUploadFormDropzone onFilesChanged={onFilesChanged} />

                <div className="md:flex flex-col gap-5 flex flex-1">
                    <div className="overflow-y-auto max-h-[200px] ">
                        <List
                            items={selectedFiles.map((file, index) => ({
                                title: file.name,
                                id: file.name + index,
                                progress: fileProgress[file.name] || 0,
                                icon: 'File',
                                iconSize: 'md',
                            }))}
                            isRemovableListItem={true}
                            className="gap-2 "
                            onClickRemove={onClickRemoveSelected}
                        />
                    </div>
                    {isInvoiceSizeLimit && <p className="text-red-500  font-medium text-xs">{t('invoiceUpload.totalTooLarge')}</p>}
                    {isInvoicesQuantityLimit && <p className="text-red-500  font-medium text-xs">{t('invoiceUpload.maxFilesExceeded')}</p>}
                    <div className="flex gap-2 flex-col">
                        <div>{t('invoiceUpload.assign')}</div>
                        <div className="flex flex-col gap-8">
                            <InvoiceUploadFormBommelSelector onChange={(a) => a && onBommelSelected(a)} />
                            {errors.bommelId && <p className="text-red-500 font-medium text-xs">{errors.bommelId.message}</p>}
                            <div className="flex flex-col gap-2">
                                <h6 className="text-sm font-medium">{t('invoiceUpload.docType')}</h6>
                                <Select className="h-16 rounded-2xl" value={documentType} onValueChanged={onDocumentTypeChange} items={transactionTypes} />
                                {errors.documentType && <p className="text-red-500 font-medium text-xs">{errors.documentType.message}</p>}
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
            </div>

            <InvoiceUploadFormAction onCancel={onUploadInvoiceChange} isValid={isValidUpload} />
        </form>
    );
};

export default memo(InvoiceUploadForm);
