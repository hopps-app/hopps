export function isAlphaVersion(): boolean {
    return import.meta.env.VITE_ALPHA_VERSION === 'true';
}
