import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import type { RadixIcons } from '@/components/ui/Icon';

interface PageTitleContextType {
    title: string;
    icon?: RadixIcons;
    setTitle: (title: string) => void;
    setIcon: (icon?: RadixIcons) => void;
}

const PageTitleContext = createContext<PageTitleContextType>({
    title: '',
    icon: undefined,
    setTitle: () => {},
    setIcon: () => {},
});

export function PageTitleProvider({ children }: { children: ReactNode }) {
    const [title, setTitle] = useState('');
    const [icon, setIcon] = useState<RadixIcons | undefined>();

    return <PageTitleContext.Provider value={{ title, icon, setTitle, setIcon }}>{children}</PageTitleContext.Provider>;
}

export function usePageTitle(title: string, icon?: RadixIcons) {
    const { setTitle, setIcon } = useContext(PageTitleContext);
    useEffect(() => {
        setTitle(title);
        setIcon(icon);
    }, [title, icon, setTitle, setIcon]);
}

export function usePageTitleValue() {
    const { title, icon } = useContext(PageTitleContext);
    return { title, icon };
}
