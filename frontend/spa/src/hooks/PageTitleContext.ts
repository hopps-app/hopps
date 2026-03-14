import { createContext } from 'react';

import type { RadixIcons } from '@/components/ui/Icon';

export interface PageTitleContextType {
    title: string;
    icon?: RadixIcons;
    setTitle: (title: string) => void;
    setIcon: (icon?: RadixIcons) => void;
}

export const PageTitleContext = createContext<PageTitleContextType>({
    title: '',
    icon: undefined,
    setTitle: () => {},
    setIcon: () => {},
});
