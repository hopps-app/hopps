import { useEffect, useState } from 'react';

// Three blinks of the `filter-hint` animation (see tailwind.config.js) plus a little room.
const HINT_MS = 2000;

/**
 * True for a moment when a page opens with filters left over from an earlier visit, so they can blink and point out why
 * the list is narrowed. Stays false on the very first visit, when nothing was stored yet, and does not come back while
 * the page stays open.
 *
 * @param ready whether the page shows its filters yet; the moment starts then
 * @param storageKey a {@link usePersistedState} key of the page: stored means the page was visited before
 */
export function useFilterHint(ready: boolean, storageKey: string): boolean {
    // Read while rendering, so before usePersistedState stores its default in an effect.
    const [active, setActive] = useState(() => {
        try {
            return localStorage.getItem(storageKey) != null;
        } catch {
            return false;
        }
    });

    useEffect(() => {
        if (!ready || !active) return;
        const timer = setTimeout(() => setActive(false), HINT_MS);
        return () => clearTimeout(timer);
    }, [ready, active]);

    return ready && active;
}
