import { useEffect, useState } from 'react';

import { Bommel } from '@/services/api/types/Bommel';
import organizationTreeService from '@/services/OrganizationTreeService';

export function useBommels(rootBommelId?: number) {
    const [bommels, setBommels] = useState<Bommel[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!rootBommelId) return;

        const fetchBommels = async () => {
            try {
                const response = await organizationTreeService.getOrganizationBommels(rootBommelId);
                setBommels(response);
            } catch (error) {
                console.error('Failed to fetch bommels', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchBommels();
    }, [rootBommelId]);

    return { bommels, isLoading };
}
