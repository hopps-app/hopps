import { useState, type ReactNode } from 'react';

import { PageTitleContext } from './PageTitleContext';

import type { RadixIcons } from '@/components/ui/Icon';

export function PageTitleProvider({ children }: { children: ReactNode }) {
    const [title, setTitle] = useState('');
    const [icon, setIcon] = useState<RadixIcons | undefined>();

    return <PageTitleContext.Provider value={{ title, icon, setTitle, setIcon }}>{children}</PageTitleContext.Provider>;
}
