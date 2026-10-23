import { useEffect } from 'react';

import { useBommelsStore } from '@/store/bommels/bommelsStore';
import { useStore } from '@/store/store';

/**
 * Loads the organization's bommels into the store when nothing has loaded them yet, for pages that can be opened
 * directly (e.g. after a reload) and read the bommels from the store.
 */
export function useEnsureBommels() {
    const { organization } = useStore();
    const { allBommels, isLoading, isError, loadBommels } = useBommelsStore();

    useEffect(() => {
        // isError stops a failing request from being retried in a loop.
        if (organization?.id && allBommels.length === 0 && !isLoading && !isError) {
            void loadBommels(organization.id);
        }
    }, [organization?.id, allBommels.length, isLoading, isError, loadBommels]);
}
