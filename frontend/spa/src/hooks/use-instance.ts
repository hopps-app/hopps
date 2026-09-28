import { DEFAULT_INSTANCE, type InstanceInfo } from '@/services/instance/instanceService';
import { useStore } from '@/store/store';

/**
 * The installation facts loaded at startup (see App.tsx). Falls back to multi-tenant defaults until they arrive, so
 * every consumer can treat the result as always present.
 */
export function useInstance(): InstanceInfo {
    return useStore((state) => state.instance) ?? DEFAULT_INSTANCE;
}
