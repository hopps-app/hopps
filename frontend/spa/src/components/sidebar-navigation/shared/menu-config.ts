import type { MenuItem } from './types';

export const menuConfig: MenuItem[] = [
    {
        id: 'dashboard',
        label: 'menu.dashboard',
        icon: 'Grid',
        path: '/dashboard',
    },
    {
        id: 'receipts',
        label: 'menu.receipts',
        icon: 'Archive',
        path: '/receipts',
        children: [
            { id: 'new-receipt', label: 'menu.new-receipt', path: '/receipts/new' },
            { id: 'expense', label: 'menu.expense', path: '/receipts/expense' },
            { id: 'intake', label: 'menu.intake', path: '/receipts/intake' },
        ],
    },
    {
        id: 'structure',
        label: 'menu.structure',
        icon: 'Commit',
        path: '/structure',
    },
    {
        id: 'admin',
        label: 'menu.admin',
        icon: 'Person',
        path: '/admin',
        children: [
            { id: 'ngo-details', label: 'menu.ngo-details', path: '/admin/ngo-details' },
            { id: 'user-access', label: 'menu.user-access', path: '/admin/user-access' },
            { id: 'categories', label: 'menu.categories', path: '/admin/categories' },
        ],
    },
];
