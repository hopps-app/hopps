import { useState, ReactNode } from 'react';
import { Dialog, Trigger, Portal, Content, Title, Close, Description, Overlay } from '@radix-ui/react-dialog';
import { useTranslation } from 'react-i18next';

import Button from '@/components/ui/Button';

interface DialogWrapperProps {
    trigger: ReactNode;
    title: string;
    description?: string;
    children?: ReactNode | ((props: { onSuccess: () => void; setOpen: (open: boolean) => void }) => ReactNode);
    onSuccess?: () => void;
    formId?: string;
}

export default function DialogWrapper({ trigger, title, description, children, onSuccess, formId }: DialogWrapperProps) {
    const [open, setOpen] = useState(false);
    const { t } = useTranslation();

    const handleSuccess = () => {
        setOpen(false);
        onSuccess?.();
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <Trigger asChild>{trigger}</Trigger>
            <Portal>
                <Overlay className="fixed inset-0 bg-black/40" />
                <Content className="fixed left-1/2 top-1/2 w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-6 shadow-xl">
                    <Title className="text-lg font-semibold">{title}</Title>
                    {description && <Description className="mt-1 text-sm text-gray-600">{description}</Description>}
                    <div className="mt-4">{typeof children === 'function' ? children({ onSuccess: handleSuccess, setOpen }) : children}</div>
                    <div className="mt-6 flex justify-end gap-3">
                        <Close asChild>
                            <Button variant="secondary" type="button">
                                {t('dialogWrapper.cancel')}
                            </Button>
                        </Close>
                        {formId ? (
                            <Button type="submit" form={formId}>
                                {t('dialogWrapper.save')}
                            </Button>
                        ) : (
                            <Button type="button" onClick={handleSuccess}>
                                {t('dialogWrapper.save')}
                            </Button>
                        )}
                    </div>
                </Content>
            </Portal>
        </Dialog>
    );
}
