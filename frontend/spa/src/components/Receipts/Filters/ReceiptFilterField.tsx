import { FC, ReactNode } from 'react';

interface ReceiptFilterFieldProps {
    label: string;
    children: ReactNode;
}

export const ReceiptFilterField: FC<ReceiptFilterFieldProps> = ({ label, children }) => (
    <div className="flex flex-col gap-1 min-w-[200px]">
        <label className="text-sm font-semibold">{label}</label>
        {children}
    </div>
);
