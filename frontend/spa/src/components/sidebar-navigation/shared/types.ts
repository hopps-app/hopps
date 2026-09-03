import type { LucideIcon } from 'lucide-react';
import type { ComponentType } from 'react';

import type { RadixIcons } from '@/components/ui/Icon';

export type MenuItem = {
    id: string;
    label: string;
    /**
     * A Radix icon name, or an icon component taking a `size` — a lucide icon, or one of our own
     * SVGs for glyphs neither set matches.
     */
    icon: RadixIcons | LucideIcon | ComponentType<{ size?: number | string }>;
    path: string;
    isAdmin?: boolean;
};
