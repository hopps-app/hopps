import type { RadixIcons } from '@/components/ui/Icon';

export type MenuItem = {
    id: string;
    label: string;
    icon: RadixIcons;
    path: string;
    isAdmin?: boolean;
};
