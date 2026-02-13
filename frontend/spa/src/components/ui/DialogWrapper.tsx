import { Dialog, Trigger, Portal, Content, Title, Close, Description, Overlay } from '@radix-ui/react-dialog';
import { useState, useCallback, ReactNode } from 'react';

import Button from '@/components/ui/Button';

interface DialogWrapperProps {
    trigger: ReactNode;
    title: string;
    description?: string;
    children?: ReactNode | ((props: { onSuccess: () => void; setOpen: (open: boolean) => void; setSubmitting: (submitting: boolean) => void }) => ReactNode);
    onSuccess?: () => void;
    formId?: string;
    secondaryLabel: string;
    primaryLabel: string;
    primaryDisabled?: boolean;
}

export default function DialogWrapper({
    trigger,
    title,
    description,
    children,
    onSuccess,
    formId,
    primaryLabel,
    secondaryLabel,
    primaryDisabled,
}: DialogWrapperProps) {
    const [open, setOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSuccess = useCallback(() => {
        if (isSubmitting) return;
        setOpen(false);
        onSuccess?.();
    }, [isSubmitting, onSuccess]);

    const handleSetSubmitting = useCallback((submitting: boolean) => {
        setIsSubmitting(submitting);
    }, []);

    const handleOpenChange = useCallback(
        (newOpen: boolean) => {
            // Prevent closing the dialog while submitting
            if (!newOpen && isSubmitting) return;
            setOpen(newOpen);
            // Reset submitting state when dialog closes
            if (!newOpen) setIsSubmitting(false);
        },
        [isSubmitting]
    );

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <Trigger asChild>{trigger}</Trigger>
            <Portal>
                <Overlay className="fixed inset-0 bg-black/40" />
                <Content className="fixed left-1/2 top-1/2 w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-6 shadow-xl">
                    <Title className="text-lg font-semibold">{title}</Title>
                    {description && <Description className="mt-1 text-sm text-gray-600">{description}</Description>}
                    <div className="mt-4">
                        {typeof children === 'function' ? children({ onSuccess: handleSuccess, setOpen, setSubmitting: handleSetSubmitting }) : children}
                    </div>
                    <div className="mt-6 flex justify-end gap-3">
                        <Close asChild>
                            <Button variant="secondary" type="button" className="min-w-[131px]" disabled={isSubmitting}>
                                {secondaryLabel}
                            </Button>
                        </Close>
                        {formId ? (
                            <Button type="submit" form={formId} className="min-w-[131px]" disabled={primaryDisabled || isSubmitting}>
                                {primaryLabel}
                            </Button>
                        ) : (
                            <Button type="button" onClick={handleSuccess} className="min-w-[131px]" disabled={primaryDisabled || isSubmitting}>
                                {primaryLabel}
                            </Button>
                        )}
                    </div>
                </Content>
            </Portal>
        </Dialog>
    );
}
