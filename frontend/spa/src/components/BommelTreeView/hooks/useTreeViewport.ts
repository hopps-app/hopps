import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import { ElementSize } from './useElementSize';

/** Fit-to-width never shrinks the tree below this; past it the user pans */
const MIN_FIT_SCALE = 0.7;
const MIN_ZOOM = 0.4;
const MAX_ZOOM = 1.5;
/** Factor per click on the zoom buttons */
const ZOOM_STEP = 1.2;
/** Space kept around the fitted tree: sides and top */
const PAD_X = 20;
const PAD_TOP = 30;
/** How much of the tree must stay inside the canvas while panning, in px */
const KEEP_VISIBLE = 80;
/** Pointer travel before a press on a card turns into a pan instead of a click */
const PAN_THRESHOLD = 4;

const clampZoom = (value: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));

interface View {
    scale: number;
    /** Position of the tree's top-left corner inside the canvas, in px */
    x: number;
    y: number;
}

type Point = { x: number; y: number };

interface Gesture {
    pointers: Map<number, Point>;
    /** Single pointer: where it went down and the view at that moment */
    start?: { point: Point; view: View };
    panning: boolean;
    /** Two pointers: distance, midpoint and view when the pinch started */
    pinch?: { distance: number; mid: Point; view: View };
}

/** Capture can fail if the pointer is already gone (e.g. released between events); the gesture still works without it */
const capture = (element: Element, pointerId: number) => {
    try {
        element.setPointerCapture(pointerId);
    } catch {
        // ignore
    }
};

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const midpoint = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

/**
 * Pan and zoom for the horizontal tree canvas, applied as a CSS transform on the tree layer (HTML, not SVG, so
 * this behaves the same on iOS):
 *
 * - mouse: drag anywhere to pan (a short press on a card stays a click), wheel zooms at the cursor
 * - touch: one finger pans, two fingers pinch-zoom
 * - `zoomIn` / `zoomOut` around the canvas centre, `center` back to fit-to-width with the root centred at the top
 *
 * Until the user pans or zooms, the view follows the fit-to-width layout as the canvas or the tree change size.
 */
export function useTreeViewport({ canvas, natural }: { canvas: HTMLElement | null; natural: ElementSize }) {
    const [size, setSize] = useState<ElementSize>({ width: 0, height: 0 });
    // null = follow the fitted view; set once the user pans or zooms
    const [userView, setUserView] = useState<View | null>(null);
    const [isPanning, setIsPanning] = useState(false);
    const gestureRef = useRef<Gesture>({ pointers: new Map(), panning: false });

    useLayoutEffect(() => {
        if (!canvas) return;
        const measure = () =>
            setSize((prev) =>
                prev.width === canvas.clientWidth && prev.height === canvas.clientHeight ? prev : { width: canvas.clientWidth, height: canvas.clientHeight }
            );
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(canvas);
        return () => observer.disconnect();
    }, [canvas]);

    const fitScale = natural.width > size.width - 2 * PAD_X ? Math.max(MIN_FIT_SCALE, (size.width - 2 * PAD_X) / natural.width) : 1;
    // The root sits centred above its children, so centring the tree centres the root
    const fitted: View = { scale: fitScale, x: (size.width - natural.width * fitScale) / 2, y: PAD_TOP };
    const view = userView ?? fitted;

    // Keep at least KEEP_VISIBLE px of the tree inside the canvas so it cannot be panned out of reach
    const clampView = useCallback(
        (next: View): View => {
            const width = natural.width * next.scale;
            const height = natural.height * next.scale;
            return {
                scale: next.scale,
                x: Math.min(size.width - KEEP_VISIBLE, Math.max(KEEP_VISIBLE - width, next.x)),
                y: Math.min(size.height - KEEP_VISIBLE, Math.max(KEEP_VISIBLE - height, next.y)),
            };
        },
        [natural.width, natural.height, size.width, size.height]
    );

    /** Zoom from `from` to `scale`, keeping the canvas point (px, py) fixed */
    const zoomAt = useCallback(
        (from: View, scale: number, px: number, py: number): View => {
            const next = clampZoom(scale);
            const ratio = next / from.scale;
            return clampView({ scale: next, x: px - (px - from.x) * ratio, y: py - (py - from.y) * ratio });
        },
        [clampView]
    );

    const viewRef = useRef(view);
    const zoomAtRef = useRef(zoomAt);
    useEffect(() => {
        viewRef.current = view;
        zoomAtRef.current = zoomAt;
    });

    // Wheel zooms at the cursor. Needs a non-passive listener to stop the page from scrolling or zooming.
    useEffect(() => {
        if (!canvas) return;
        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();
            const rect = canvas.getBoundingClientRect();
            const delta = e.deltaY * (e.deltaMode === 1 ? 16 : 1);
            // Trackpad pinch arrives as ctrl + small deltas, so it gets a stronger factor
            const factor = Math.exp(-delta * (e.ctrlKey ? 0.01 : 0.0015));
            const current = viewRef.current;
            setUserView(zoomAtRef.current(current, current.scale * factor, e.clientX - rect.left, e.clientY - rect.top));
        };
        canvas.addEventListener('wheel', handleWheel, { passive: false });
        return () => canvas.removeEventListener('wheel', handleWheel);
    }, [canvas]);

    const toCanvas = (e: React.PointerEvent): Point => {
        const rect = e.currentTarget.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const endGesture = (e: React.PointerEvent) => {
        const gesture = gestureRef.current;
        gesture.pointers.delete(e.pointerId);
        gesture.pinch = undefined;
        if (gesture.pointers.size === 1) {
            // One finger left after a pinch: continue as a pan from here
            const [point] = gesture.pointers.values();
            gesture.start = { point, view: viewRef.current };
        } else if (gesture.pointers.size === 0) {
            gesture.start = undefined;
            gesture.panning = false;
            setIsPanning(false);
        }
    };

    const handlers = {
        onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
            if (e.pointerType === 'mouse' && e.button !== 0) return;
            // Controls, form fields and the drag handle keep their own behaviour
            if ((e.target as Element).closest('button, input, textarea, [data-drag-handle]')) return;
            const gesture = gestureRef.current;
            const point = toCanvas(e);
            gesture.pointers.set(e.pointerId, point);
            if (gesture.pointers.size === 2) {
                const [a, b] = gesture.pointers.values();
                gesture.pinch = { distance: distance(a, b), mid: midpoint(a, b), view: viewRef.current };
                capture(e.currentTarget, e.pointerId);
            } else if (gesture.pointers.size === 1) {
                gesture.start = { point, view: viewRef.current };
                gesture.panning = false;
            }
        },
        onPointerMove: (e: React.PointerEvent<HTMLElement>) => {
            const gesture = gestureRef.current;
            if (!gesture.pointers.has(e.pointerId)) return;
            const point = toCanvas(e);
            gesture.pointers.set(e.pointerId, point);

            if (gesture.pinch && gesture.pointers.size >= 2) {
                const [a, b] = gesture.pointers.values();
                const { pinch } = gesture;
                const mid = midpoint(a, b);
                // Zoom around where the pinch started, then follow the fingers' midpoint
                const zoomed = zoomAt(pinch.view, pinch.view.scale * (distance(a, b) / pinch.distance), pinch.mid.x, pinch.mid.y);
                setUserView(clampView({ ...zoomed, x: zoomed.x + mid.x - pinch.mid.x, y: zoomed.y + mid.y - pinch.mid.y }));
                return;
            }

            const { start } = gesture;
            if (!start) return;
            const dx = point.x - start.point.x;
            const dy = point.y - start.point.y;
            if (!gesture.panning) {
                if (Math.hypot(dx, dy) < PAN_THRESHOLD) return;
                // From here on this is a pan: capture the pointer, which also keeps the press from becoming a click
                gesture.panning = true;
                capture(e.currentTarget, e.pointerId);
                setIsPanning(true);
            }
            setUserView(clampView({ scale: start.view.scale, x: start.view.x + dx, y: start.view.y + dy }));
        },
        onPointerUp: endGesture,
        onPointerCancel: endGesture,
    };

    /** Pan by a delta, used by drag and drop to move the view while a card is held near the canvas edge */
    const panBy = useCallback(
        (dx: number, dy: number) => {
            const current = viewRef.current;
            setUserView(clampView({ scale: current.scale, x: current.x + dx, y: current.y + dy }));
        },
        [clampView]
    );

    return {
        transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
        ready: size.width > 0 && natural.width > 0,
        isPanning,
        canZoomIn: view.scale < MAX_ZOOM,
        canZoomOut: view.scale > MIN_ZOOM,
        zoomIn: () => setUserView(zoomAt(view, view.scale * ZOOM_STEP, size.width / 2, size.height / 2)),
        zoomOut: () => setUserView(zoomAt(view, view.scale / ZOOM_STEP, size.width / 2, size.height / 2)),
        center: () => setUserView(null),
        panBy,
        handlers,
    };
}
