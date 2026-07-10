import { Building2 } from 'lucide-react';

import type { MenuItem } from './types';

export const menuConfig: MenuItem[] = [
    // 'Home' is reserved for the future dashboard.
    {
        id: 'organizations',
        label: 'menu.organizations',
        // Radix has no building glyph; `icon` is an unused fallback here.
        icon: 'IdCard',
        lucideIcon: Building2,
        path: '/organizations',
    },
];
