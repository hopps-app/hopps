import type { LucideIcon } from 'lucide-react';

import type { RadixIcons } from '@/components/ui/Icon';

export type MenuItem = {
    id: string;
    label: string;
    /** Either a Radix icon name or a lucide component, for icons the Radix set has no equivalent for. */
    icon: RadixIcons | LucideIcon;
    path: string;
    isAdmin?: boolean;
};
