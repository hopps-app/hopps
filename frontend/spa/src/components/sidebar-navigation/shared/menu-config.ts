import { Building2 } from 'lucide-react';

import type { MenuItem } from './types';

import { HouseIcon, LandmarkIcon, ListIcon, NetworkIcon, ReceiptIcon, SettingsIcon, SheetIcon, TagIcon } from '@/components/ui/icons/lineIcons';

export const menuConfig: MenuItem[] = [
    {
        id: 'dashboard',
        label: 'menu.dashboard',
        icon: HouseIcon,
        icon: HouseIcon,
        path: '/dashboard',
    },
    {
        id: 'receipts',
        label: 'menu.receipts',
        icon: ReceiptIcon,
        path: '/receipts',
    },
    {
        id: 'structure',
        label: 'menu.structure',
        icon: NetworkIcon,
        path: '/structure',
    },
    {
        id: 'transactions',
        label: 'menu.transactions',
        icon: ListIcon,
        path: '/transactions',
    },
    {
        id: 'bank-accounts',
        label: 'menu.bankAccounts',
        icon: LandmarkIcon,
        path: '/bank-accounts',
    },
    {
        id: 'categories',
        label: 'menu.categories',
        icon: TagIcon,
        path: '/admin/categories',
    },
    {
        id: 'reports',
        label: 'menu.reports',
        icon: SheetIcon,
        path: '/reports',
    },
    // Footer group, below the main navigation.
    {
        id: 'ngo-details',
        label: 'menu.ngo-details',
        icon: Building2,
        path: '/admin/ngo-details',
        isAdmin: true,
    },
    {
        id: 'profile',
        label: 'settings.menu.profile',
        icon: SettingsIcon,
        path: '/profile',
        isAdmin: true,
    },
];
