import type { RadixIcons } from '@/components/ui/Icon';

export type MenuItem = {
    id: string;
    label: string;
    icon: RadixIcons;
    path?: string;
    children?: Omit<MenuItem, 'icon'>[];
};

export type SubMenuItem = Omit<MenuItem, 'icon'>;

export const menuConfig: MenuItem[] = [
    {
        id: 'dashboard',
        label: 'Dashboard',
        icon: 'Grid',
        path: '/dashboard',
        children: [
            { id: 'receipts', label: 'Receipts', path: '/dashboard/receipts' },
            { id: 'new-receipt', label: 'New receipt', path: '/dashboard/new-receipt' },
            { id: 'income', label: 'Income', path: '/dashboard/income' },
            { id: 'expenses', label: 'Expenses', path: '/dashboard/expenses' },
        ],
    },
    { id: 'receipts', label: 'Receipts', icon: 'Archive', path: '/receipts' },
    { id: 'structure', label: 'Structure', icon: 'Commit', path: '/structure' },
    { id: 'admin', label: 'Admin', icon: 'Person', path: '/admin' },
];
