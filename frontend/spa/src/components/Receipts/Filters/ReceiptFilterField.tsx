import { FC, ReactNode } from 'react';

interface ReceiptFilterFieldProps {
    label?: string;
    children: ReactNode;
}

export const ReceiptFilterField: FC<ReceiptFilterFieldProps> = ({ label, children }) => (
    <div className="flex flex-col gap-1 min-w-[200px]">
        <label className="text-sm font-light text-gray-600">{label}</label>
        {children}
    </div>
);
