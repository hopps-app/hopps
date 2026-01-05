import { FC, memo } from 'react';
import { useTranslation } from 'react-i18next';

import Button from '@/components/ui/Button.tsx';

type InvoiceUploadFormActionPropsType = {
    onCancel: () => void;
    isValid: boolean;
};

const InvoiceUploadFormAction: FC<InvoiceUploadFormActionPropsType> = ({ onCancel, isValid }) => {
    const { t } = useTranslation();

    return (
        <div className="flex flex-row gap-8 justify-end mt-4">
            <Button
                className="max-h-8 rounded-[var(--btn-radius)] bg-transparent border-solid border-[var(--muted)] border text-[var(--muted)] hover:bg-[var(--border-line)] hover:text-[var(--hover-effect)]"
                type="button"
                onClick={onCancel}
            >
                {t('common.cancel')}
            </Button>
            <Button className="max-h-8 rounded-[var(--btn-radius)]" type="submit" disabled={isValid}>
                {t('common.save')}
            </Button>
        </div>
    );
};

export default memo(InvoiceUploadFormAction);
