import type { RadixIcons } from '@/components/ui/Icon';

export type MenuItem = {
    id: string;
    /** i18n key, resolved with t() at render time — never a literal string. */
    label: string;
    icon: RadixIcons;
    path: string;
};
