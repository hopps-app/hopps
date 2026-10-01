import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type SetupState = {
    /** Organizations whose setup strip the user has hidden, in this browser. */
    hiddenFor: Record<number, true>;
    hide: (organizationId: number) => void;
    show: (organizationId: number) => void;
};

/**
 * Whether the first-use setup strip is hidden, per organization. Shared by the dashboard strip and the sidebar entry
 * that brings it back, so both react to the same change; persisted in local storage like other view preferences.
 */
export const useSetupStore = create<SetupState>()(
    persist(
        (set) => ({
            hiddenFor: {},
            hide: (organizationId) => set((state) => ({ hiddenFor: { ...state.hiddenFor, [organizationId]: true } })),
            show: (organizationId) =>
                set((state) => ({
                    hiddenFor: Object.fromEntries(Object.entries(state.hiddenFor).filter(([id]) => Number(id) !== organizationId)) as Record<number, true>,
                })),
        }),
        { name: 'hopps.setup' }
    )
);
