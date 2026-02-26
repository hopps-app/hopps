import { FC, ReactNode } from 'react';

interface ReceiptFilterFieldProps {
    label?: string;
    children: ReactNode;
}

export const ReceiptFilterField: FC<ReceiptFilterFieldProps> = ({ label, children }) => (
    <div className="flex flex-col gap-1.5">
        {label && <label className="text-xs font-medium text-[var(--grey-700)] uppercase tracking-wider">{label}</label>}
        {children}
    </div>
);
