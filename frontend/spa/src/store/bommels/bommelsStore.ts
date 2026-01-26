import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import organizationTreeService from '@/services/OrganisationTreeService.ts';
import { BommelActions, BommelsState } from '@/store/bommels/types';

export const useBommelsStore = create<BommelsState & BommelActions>()(
    devtools((set) => {
        return {
            organizationId: null,
            rootBommel: null,
            allBommels: [],
            isLoading: false,
            isError: false,

            loadBommels: async (organizationId: number) => {
                set({ isLoading: true, isError: false, organizationId });

                try {
                    const fetchedBommels = await organizationTreeService.getOrganizationBommels(organizationId);

                    // First bommel in the list is the root bommel
                    const root = fetchedBommels.length > 0 ? fetchedBommels[0] : null;

                    set({ rootBommel: root, allBommels: fetchedBommels });
                } catch (error) {
                    console.error(error);

                    set({ isError: true });
                } finally {
                    set({ isLoading: false });
                }
            },
            setLoading: (value: boolean) => {
                set({ isLoading: value, isError: false });
            },

            reload: async () => {
                const { organizationId } = useBommelsStore.getState();
                if (organizationId) {
                    await useBommelsStore.getState().loadBommels(organizationId);
                }
            },
        };
    })
);
