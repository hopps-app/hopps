// Facts about this installation that the SPA needs before anyone is logged in: does it serve one
// association (self-hosted) or many (the hosted SaaS), and — for a single-tenant installation — has
// its organization been created yet.
//
// The backend is the single source of truth here (it enforces the mode); the SPA only mirrors it.
// When the backend cannot be reached the SPA falls back to multi-tenant behaviour, which is what it
// always did before the mode existed.

export type TenancyMode = 'single' | 'multi';

export interface InstanceInfo {
    tenancy: TenancyMode;
    /** Only ever true on a single-tenant installation whose organization has not been created yet. */
    setupRequired: boolean;
    /** Name of the one organization of a single-tenant installation, once set up. */
    organizationName: string | null;
}

export const DEFAULT_INSTANCE: InstanceInfo = {
    tenancy: 'multi',
    setupRequired: false,
    organizationName: null,
};

export async function fetchInstanceInfo(): Promise<InstanceInfo> {
    try {
        // Loaded on demand, like the organization in App.tsx, so the api client is not part of the initial chunk.
        const apiService = (await import('@/services/ApiService.ts')).default;
        const info = await apiService.orgService.instance();
        return {
            tenancy: info.tenancy === 'SINGLE' ? 'single' : 'multi',
            setupRequired: info.setupRequired === true,
            organizationName: info.organizationName ?? null,
        };
    } catch (error) {
        console.error('Failed to load instance info, assuming multi-tenant:', error);
        return DEFAULT_INSTANCE;
    }
}
