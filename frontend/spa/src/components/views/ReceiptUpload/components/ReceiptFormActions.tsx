import { useTranslation } from 'react-i18next';

import Button from '@/components/ui/Button';

interface ReceiptFormActionsProps {
    isValid: boolean;
    onSubmit: () => void;
    onSaveDraft: () => void;
    onCancel: () => void;
}

export function ReceiptFormActions({ isValid, onSubmit, onSaveDraft, onCancel }: ReceiptFormActionsProps) {
    const { t } = useTranslation();

    return (
        <div className="flex justify-end gap-3 mt-6 grid-cols-2">
            <Button variant="outline" onClick={onCancel} type="button">
                {t('common.cancel')}
            </Button>
            <Button variant="secondary" onClick={onSaveDraft} type="button">
                {t('receipts.upload.saveAsDraft')}
            </Button>
            <Button onClick={onSubmit} disabled={!isValid} type="button">
                {t('common.save')}
            </Button>
        </div>
    );
}

export default ReceiptFormActions;
