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
    },
    {
        id: 'structure',
        label: 'menu.structure',
        icon: 'Commit',
        path: '/structure',
    },
    {
        id: 'ngo-details',
        label: 'menu.ngo-details',
        icon: 'Person',
        path: '/admin/ngo-details',
        isAdmin: true,
    },
    {
        id: 'categories',
        label: 'menu.categories',
        icon: 'MixerHorizontal',
        path: '/admin/categories',
        isAdmin: true,
    },
];
