import { useEffect, useState } from 'react';

import { EMPTY_LEGAL_CONFIG, fetchLegalConfig, type LegalConfig } from '@/services/legal/legalService';

// Module-level cache: the legal config never changes for the lifetime of the page,
// so it is fetched once and shared across every footer/route that asks for it.
// Kept deliberately free of React Query so it works from any mount point (footer,
// public routes) regardless of provider nesting.
let cache: Promise<LegalConfig> | null = null;

function loadLegalConfig(): Promise<LegalConfig> {
    if (!cache) {
        cache = fetchLegalConfig();
    }
    return cache;
}

export function useLegalConfig(): { config: LegalConfig; loaded: boolean } {
    const [state, setState] = useState<{ config: LegalConfig; loaded: boolean }>({
        config: EMPTY_LEGAL_CONFIG,
        loaded: false,
    });

    useEffect(() => {
        let active = true;
        loadLegalConfig().then((config) => {
            if (active) setState({ config, loaded: true });
        });
        return () => {
            active = false;
        };
    }, []);

    return state;
}
