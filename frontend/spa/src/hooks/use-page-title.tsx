import { useContext, useEffect } from 'react';

import { PageTitleContext } from './PageTitleContext';

import type { RadixIcons } from '@/components/ui/Icon';

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
