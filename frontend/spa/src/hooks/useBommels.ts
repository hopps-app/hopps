import { useEffect, useState } from 'react';

import { useStore } from '@/store/store.ts';
import { Bommel } from '@/services/api/types/Bommel';
import organizationTreeService from '@/services/OrganizationTreeService';

export function useBommels() {
    const [bommels, setBommels] = useState<Bommel[]>([]);
    const [rootBommel, setRootBommel] = useState<Bommel | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const store = useStore();
    const organization = store.organization;

    useEffect(() => {
        if (!organization?.id) return;

        organizationTreeService.ensureRootBommelCreated(organization.id).then((bommel) => {
            if (bommel) setRootBommel(bommel);
        });
    }, [organization]);

    useEffect(() => {
        if (!rootBommel?.id) return;

        const fetchBommels = async () => {
            try {
                const response = await organizationTreeService.getOrganizationBommels(rootBommel?.id);
                setBommels(response);
            } catch (error) {
                console.error('Failed to fetch bommels', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchBommels();
    }, [rootBommel?.id]);

    return { bommels, isLoading, rootBommel };
}
