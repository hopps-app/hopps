import { useCallback, useRef, useState } from 'react';

export interface ElementSize {
    width: number;
    height: number;
}

/**
 * Tracks an element's layout size. Uses offsetWidth/offsetHeight, which ignore CSS transforms, so an
 * element scaled with `transform` still reports its natural size.
 *
 * Returns a callback ref so the observer attaches whenever the element mounts, including after a
 * loading or empty state.
 */
export function useElementSize<T extends HTMLElement>() {
    const [size, setSize] = useState<ElementSize>({ width: 0, height: 0 });
    const observerRef = useRef<ResizeObserver | null>(null);

    const ref = useCallback((element: T | null) => {
        observerRef.current?.disconnect();
        observerRef.current = null;
        if (!element) return;

        const measure = () => {
            const width = element.offsetWidth;
            const height = element.offsetHeight;
            setSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
        };

        measure();
        observerRef.current = new ResizeObserver(measure);
        observerRef.current.observe(element);
    }, []);

    return [ref, size] as const;
}
