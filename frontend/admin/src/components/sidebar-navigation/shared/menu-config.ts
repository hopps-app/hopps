import { Building2, LayoutDashboard } from 'lucide-react';

import type { MenuItem } from './types';

export const menuConfig: MenuItem[] = [
    {
        id: 'overview',
        label: 'menu.overview',
        icon: 'Dashboard',
        lucideIcon: LayoutDashboard,
        path: '/overview',
    },
    {
        id: 'organizations',
        label: 'menu.organizations',
        // Radix has no building glyph; `icon` is an unused fallback here.
        icon: 'IdCard',
        lucideIcon: Building2,
        path: '/organizations',
    },
];
