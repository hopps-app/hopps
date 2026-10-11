import { RefObject, useCallback, useEffect, useRef } from 'react';

/** Distance from an edge, in px, at which dragging starts to scroll */
const EDGE = 56;
/** Scroll speed at the very edge, in px per frame */
const MAX_SPEED = 14;

function findScrollParent(element: HTMLElement): HTMLElement {
    let current = element.parentElement;
    while (current) {
        const { overflowY } = getComputedStyle(current);
        if ((overflowY === 'auto' || overflowY === 'scroll') && current.scrollHeight > current.clientHeight) {
            return current;
        }
        current = current.parentElement;
    }
    return (document.scrollingElement as HTMLElement) ?? document.documentElement;
}

/** Visible span of a scroller along one axis, clipped to the viewport */
function visibleSpan(element: HTMLElement, axis: 'x' | 'y'): [number, number] {
    const viewportEnd = axis === 'y' ? window.innerHeight : window.innerWidth;
    if (element === document.scrollingElement) return [0, viewportEnd];
    const rect = element.getBoundingClientRect();
    return axis === 'y' ? [Math.max(0, rect.top), Math.min(viewportEnd, rect.bottom)] : [Math.max(0, rect.left), Math.min(viewportEnd, rect.right)];
}

/** Negative near the start edge, positive near the end edge, 0 in between; faster the closer the pointer gets */
function edgeSpeed(position: number, [start, end]: [number, number]): number {
    if (position < start + EDGE) return -Math.ceil(((start + EDGE - position) / EDGE) * MAX_SPEED);
    if (position > end - EDGE) return Math.ceil(((position - (end - EDGE)) / EDGE) * MAX_SPEED);
    return 0;
}

/**
 * While a Bommel is being dragged, holding it near an edge moves the view: the page (or whichever ancestor
 * scrolls) vertically, and, when `panCanvas` is given, the pan/zoom canvas in both directions. Without this,
 * cards outside the visible area could not be reached as drop targets, which on a phone is most of them.
 *
 * `onScrolled` runs after each step with the pointer position, so the drop target under the stationary
 * pointer can be looked up again.
 */
export function useDragAutoScroll(
    active: boolean,
    containerRef: RefObject<HTMLElement | null>,
    onScrolled: (x: number, y: number) => void,
    panCanvas?: (dx: number, dy: number) => void
): (x: number, y: number) => void {
    const pointerRef = useRef<{ x: number; y: number } | null>(null);
    const onScrolledRef = useRef(onScrolled);
    const panCanvasRef = useRef(panCanvas);
    useEffect(() => {
        onScrolledRef.current = onScrolled;
        panCanvasRef.current = panCanvas;
    });

    useEffect(() => {
        const container = containerRef.current;
        if (!active || !container) return;

        const page = findScrollParent(container);
        let frame = 0;

        const tick = () => {
            const pointer = pointerRef.current;
            if (pointer) {
                let moved = false;
                const dy = edgeSpeed(pointer.y, visibleSpan(page, 'y'));
                if (dy) {
                    const before = page.scrollTop;
                    page.scrollTop += dy;
                    moved = page.scrollTop !== before;
                }
                const pan = panCanvasRef.current;
                if (pan) {
                    const canvasDx = edgeSpeed(pointer.x, visibleSpan(container, 'x'));
                    const canvasDy = edgeSpeed(pointer.y, visibleSpan(container, 'y'));
                    if (canvasDx || canvasDy) {
                        // Content moves opposite to the edge the card is held against
                        pan(-canvasDx, -canvasDy);
                        moved = true;
                    }
                }
                if (moved) {
                    onScrolledRef.current(pointer.x, pointer.y);
                }
            }
            frame = requestAnimationFrame(tick);
        };

        frame = requestAnimationFrame(tick);
        return () => {
            cancelAnimationFrame(frame);
            pointerRef.current = null;
        };
    }, [active, containerRef]);

    return useCallback((x: number, y: number) => {
        pointerRef.current = { x, y };
    }, []);
}
