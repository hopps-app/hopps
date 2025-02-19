import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import organizationTreeService from '@/services/OrganizationTreeService';
import { BommelActions, BommelsState } from '@/store/bommels/types';

export const useBommelsStore = create<BommelsState & BommelActions>()(
    devtools((set) => {
        return {
            rootBommel: null,
            allBommels: [],
            isLoading: false,
            isError: false,

            loadBommels: async (organizationId: number) => {
                set({ isLoading: true, isError: false });

                try {
                    const root = await organizationTreeService.ensureRootBommelCreated(organizationId);
                    if (!root) throw new Error('Root bommel not found');

                    const fetchedBommels = await organizationTreeService.getOrganizationBommels(root.id);

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
                const { rootBommel } = useBommelsStore.getState();
                if (rootBommel) {
                    await useBommelsStore.getState().loadBommels(rootBommel.id);
                }
            },
        };
    })
);
