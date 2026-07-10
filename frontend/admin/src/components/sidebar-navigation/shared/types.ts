import type { LucideIcon } from 'lucide-react';

import type { RadixIcons } from '@/components/ui/Icon';

export type MenuItem = {
    id: string;
    /** i18n key, resolved with t() at render time — never a literal string. */
    label: string;
    /** Radix icon name. Ignored when `lucideIcon` is set. */
    icon: RadixIcons;
    /** Optional Lucide icon component; takes precedence over `icon` when present. */
    lucideIcon?: LucideIcon;
    path: string;
};
