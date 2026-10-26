import { AlertCircle, AlertTriangle, Check, Info } from 'lucide-react';

import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from './Toast.tsx';

import { useToast } from '@/hooks/use-toast';

// Icon per state; it takes the toast's text colour (see Toast.tsx).
const ICON = { success: Check, error: AlertCircle, warning: AlertTriangle, info: Info } as const;

export function Toaster() {
    const { toasts } = useToast();

    return (
        <ToastProvider>
            {toasts.map(function ({ id, title, description, action, variant, ...props }) {
                const Icon = ICON[variant ?? 'info'];
                return (
                    // Errors stay until closed so they are not missed; the other states go away on their own.
                    <Toast key={id} variant={variant} duration={variant === 'error' ? Infinity : undefined} {...props}>
                        <Icon size={18} strokeWidth={2.5} className="mt-px flex-shrink-0" />
                        <div className="grid min-w-0 flex-1 gap-0.5">
                            {title && <ToastTitle>{title}</ToastTitle>}
                            {description && <ToastDescription>{description}</ToastDescription>}
                        </div>
                        {action}
                        <ToastClose />
                    </Toast>
                );
            })}
            <ToastViewport />
        </ToastProvider>
    );
}
