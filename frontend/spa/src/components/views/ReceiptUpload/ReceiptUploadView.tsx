import { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import InvoiceUploadFormDropzone from '@/components/InvoiceUploadForm/InvoiceUploadFormDropzone';
import Switch from '@/components/ui/Switch';
import { useToast } from '@/hooks/use-toast';
import apiService from '@/services/ApiService';
import { useBommelsStore } from '@/store/bommels/bommelsStore';
import { useStore } from '@/store/store';

import { ReceiptFormActions, ReceiptFormFields } from './components';
import { useReceiptForm } from './hooks';

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
    } = useReceiptForm();

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

                await apiService.orgService.documentPOST(
                    {
                        data: selected,
                        fileName: selected.name,
                    },
                    bommelId ?? 54, // Use selected bommelId or fallback
                    false,
                    'INVOICE'
                );
                showSuccess(t('receipts.upload.uploadSuccess'));
                setFile(null);
            } catch (e) {
                console.error(e);
                showError(t('receipts.upload.uploadFailed'));
            } finally {
                setIsSubmitting(false);
            }
        },
        [isSubmitting, showError, showSuccess, isAutoRead, bommelId, setFile, setIsSubmitting, setAllFieldsLoading, t]
    );

    const handleSubmit = useCallback(async () => {
        if (!isValid) {
            showError(t('common.validationError'));
            return;
        }
        if (!file || !bommelId) return;

        try {
            setIsSubmitting(true);
            await apiService.orgService.documentPOST(
                {
                    data: file,
                    fileName: file.name,
                },
                bommelId,
                false,
                'RECEIPT'
            );

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
            <h2 className="text-2xl font-semibold">{t('receipts.upload.title')}</h2>

            <div className="grid grid-cols-1 gap-x-6 gap-y-0 lg:grid-cols-2 items-stretch">
                <div className="flex flex-col">
                    <InvoiceUploadFormDropzone onFilesChanged={onFilesChanged} previewFile={file} />
                </div>

                <div className="min-w-0 min-h-0 border border-grey-700 p-4 rounded-[30px]">
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

                <Switch
                    checked={isAutoRead}
                    onCheckedChange={() => setIsAutoRead((v) => !v)}
                    label={t('receipts.upload.autoRead')}
                />

                <ReceiptFormActions isValid={isValid} onSubmit={handleSubmit} onSaveDraft={handleSaveDraft} onCancel={handleCancel} />
            </div>
        </div>
    );
}

export default ReceiptUploadView;
