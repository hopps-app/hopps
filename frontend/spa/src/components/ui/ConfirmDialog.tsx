import * as DialogPrimitive from '@radix-ui/react-dialog';
import { AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/utils';

const FONT = '"Hanken Grotesk", "Reddit Sans", sans-serif';

interface ConfirmDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    destructive?: boolean;
    loading?: boolean;
}

/**
 * Confirmation dialog styled in the application's prototype design (Hanken Grotesk, prototype palette).
 * Use instead of window.confirm() for destructive or important actions.
 */
export function ConfirmDialog({
    open,
    onOpenChange,
    title,
    description,
    confirmLabel,
    cancelLabel,
    onConfirm,
    destructive = false,
    loading = false,
}: ConfirmDialogProps) {
    const { t } = useTranslation();

    return (
        <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
            <DialogPrimitive.Portal>
                <DialogPrimitive.Overlay className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
                <DialogPrimitive.Content
                    onOpenAutoFocus={(e) => e.preventDefault()}
                    className="fixed left-[50%] top-[50%] z-[101] w-full max-w-[420px] translate-x-[-50%] translate-y-[-50%] p-6 duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
                    style={{ fontFamily: FONT, background: '#FFFFFF', borderRadius: 18, boxShadow: '0 12px 40px rgba(20,20,40,.18)' }}
                >
                    <div className="flex items-start gap-4">
                        <span
                            className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{ background: destructive ? '#FBEAEF' : '#F3EAFB' }}
                        >
                            <AlertTriangle size={20} className={destructive ? 'text-[#B12C4C]' : 'text-[#7E3FB4]'} />
                        </span>
                        <div className="min-w-0 pt-0.5">
                            <DialogPrimitive.Title className="text-[16px] font-bold text-[#1B1B1F] leading-snug">{title}</DialogPrimitive.Title>
                            {description && (
                                <DialogPrimitive.Description className="mt-1.5 text-[13.5px] text-[#6B6B76] leading-relaxed">
                                    {description}
                                </DialogPrimitive.Description>
                            )}
                        </div>
                    </div>

                    <div className="mt-6 flex items-center justify-end gap-2">
                        <DialogPrimitive.Close
                            className="px-4 py-2 rounded-full text-[14px] font-bold border border-[#E0E0E6] text-[#6B6B76] hover:bg-[#F8F8FA] transition-colors"
                            disabled={loading}
                        >
                            {cancelLabel ?? t('common.cancel')}
                        </DialogPrimitive.Close>
                        <button
                            onClick={onConfirm}
                            disabled={loading}
                            className={cn(
                                'inline-flex items-center justify-center px-5 py-2 rounded-full text-[14px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50'
                            )}
                            style={{
                                background: destructive ? '#B12C4C' : 'linear-gradient(100deg,#7E3FB4,#9955CC)',
                            }}
                        >
                            {loading ? '…' : (confirmLabel ?? t('common.confirm'))}
                        </button>
                    </div>
                </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
    );
}
