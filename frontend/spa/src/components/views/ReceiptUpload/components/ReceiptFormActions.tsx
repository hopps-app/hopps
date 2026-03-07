import { useTranslation } from 'react-i18next';

import Button from '@/components/ui/Button';

interface ReceiptFormActionsProps {
    isValid: boolean;
    canSaveDraft: boolean;
    onSubmit: () => void;
    onSaveDraft: () => void;
    onCancel: () => void;
    saveDisabled?: boolean;
    readOnly?: boolean;
    onEdit?: () => void;
}

export function ReceiptFormActions({
    isValid,
    canSaveDraft,
    onSubmit,
    onSaveDraft,
    onCancel,
    saveDisabled = false,
    readOnly,
    onEdit,
}: ReceiptFormActionsProps) {
    const { t } = useTranslation();

    if (readOnly) {
        return (
            <div className="flex flex-col-reverse sm:flex-row gap-3">
                <Button variant="outline" onClick={onCancel} type="button">
                    {t('common.goBack')}
                </Button>
                <Button onClick={onEdit} type="button">
                    {t('common.edit')}
                </Button>
            </div>
        );
    }

    return (
        <div className="flex flex-col-reverse sm:flex-row gap-3">
            <Button variant="outline" onClick={onCancel} type="button">
                {t('common.cancel')}
            </Button>
            <Button variant="secondary" onClick={onSaveDraft} disabled={!canSaveDraft} type="button">
                {t('receipts.upload.saveAsDraft')}
            </Button>
            <Button onClick={onSubmit} disabled={saveDisabled || !isValid} type="button">
                {t('common.save')}
            </Button>
        </div>
    );
}

export default ReceiptFormActions;
