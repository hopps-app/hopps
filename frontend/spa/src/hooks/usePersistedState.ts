import { Dispatch, SetStateAction, useEffect, useState } from 'react';

/**
 * Drop-in replacement for {@link useState} that persists the value in {@code localStorage} under a stable {@code key},
 * so it survives navigation between pages and full reloads. Used to remember per-page sort orders and filters.
 *
 * The key must be a stable literal per call site. Reads/writes are wrapped in try/catch so a disabled or full storage
 * (or malformed stored JSON) degrades gracefully to in-memory state with the provided default.
 */
export function usePersistedState<T>(key: string, defaultValue: T): [T, Dispatch<SetStateAction<T>>] {
    const [state, setState] = useState<T>(() => {
        try {
            const raw = localStorage.getItem(key);
            return raw != null ? (JSON.parse(raw) as T) : defaultValue;
        } catch {
            return defaultValue;
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem(key, JSON.stringify(state));
        } catch {
            // storage unavailable / quota exceeded — keep working with in-memory state only
        }
    }, [key, state]);

    return [state, setState];
}
