// Configurable Impressum / Datenschutzerklärung.
//
// These pages are served by the SPA's OWN hosting server (docker/node/server.js),
// not by the org backend — so, unlike backend calls, they use a plain same-origin
// fetch instead of the generated api-client. In dev (Vite) there is no hosting
// server, so the endpoints 404/fail and every page resolves to `none` (hidden).

export type LegalMode = 'url' | 'inline' | 'none';
export type LegalFormat = 'html' | 'text';

export interface LegalPageConfig {
    mode: LegalMode;
    url?: string;
    format?: LegalFormat;
}

export interface LegalConfig {
    imprint: LegalPageConfig;
    privacy: LegalPageConfig;
}

export type LegalPageKey = 'imprint' | 'privacy';

export const EMPTY_LEGAL_CONFIG: LegalConfig = {
    imprint: { mode: 'none' },
    privacy: { mode: 'none' },
};

export async function fetchLegalConfig(): Promise<LegalConfig> {
    try {
        const res = await fetch('/legal/config', { headers: { Accept: 'application/json' } });
        if (!res.ok) return EMPTY_LEGAL_CONFIG;
        return (await res.json()) as LegalConfig;
    } catch {
        return EMPTY_LEGAL_CONFIG;
    }
}

export async function fetchLegalContent(page: LegalPageKey): Promise<string> {
    const res = await fetch(`/legal/${page}`, { headers: { Accept: 'text/html, text/plain' } });
    if (!res.ok) throw new Error(`Failed to load legal content (${res.status})`);
    return res.text();
}
