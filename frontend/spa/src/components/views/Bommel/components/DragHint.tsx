import { Hand, HandGrab } from 'lucide-react';
import { type RefObject, useCallback, useEffect, useState } from 'react';

import { BommelTreeNodeModel } from '@/components/BommelTreeView/BommelTreeNodeModel';
import Emoji from '@/components/ui/Emoji';

interface DragHintProps {
    /** The element the hint is drawn over; it must be positioned and contain the tree's cards */
    containerRef: RefObject<HTMLElement | null>;
    tree: BommelTreeNodeModel[];
    /** The move to show when both cards are on screen (the example); otherwise one is picked from the cards in view */
    preferred?: { fromId: number; toId: number };
}

interface Geometry {
    name: string;
    emoji: string;
    x: number;
    y: number;
    dx: number;
    dy: number;
    target: { left: number; top: number; width: number; height: number };
}

const centre = (r: DOMRect) => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });

/**
 * Which move to show: the preferred one if both cards are in view, else a Bommel without children on screen, the one
 * nearest the middle of the canvas, dropped on the nearest other Bommel that is not already its parent.
 */
function pickMove(cards: Map<number, DOMRect>, box: DOMRect, tree: BommelTreeNodeModel[], preferred?: DragHintProps['preferred']) {
    const inView = (r: DOMRect) => r.right > box.left && r.left < box.right && r.bottom > box.top && r.top < box.bottom;
    if (preferred && cards.has(preferred.fromId) && cards.has(preferred.toId) && inView(cards.get(preferred.fromId)!) && inView(cards.get(preferred.toId)!))
        return preferred;

    const rootId = Number(tree.find((n) => n.data?.isRoot)?.id);
    const parentOf = (id: number) => {
        const parent = tree.find((n) => n.id === id)?.parent;
        return parent === 0 ? rootId : Number(parent);
    };
    const visible = [...cards].filter(([id, r]) => id !== rootId && inView(r));
    const hasChildOnScreen = (id: number) => visible.some(([other]) => parentOf(other) === id);
    const middle = { x: box.left + box.width / 2, y: box.top + box.height / 2 };
    const distance = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

    const sources = visible.filter(([id]) => !hasChildOnScreen(id)).sort(([, a], [, b]) => distance(centre(a), middle) - distance(centre(b), middle));
    for (const [fromId, fromRect] of sources) {
        const targets = visible
            .filter(([id]) => id !== fromId && id !== parentOf(fromId))
            .sort(([, a], [, b]) => distance(centre(a), centre(fromRect)) - distance(centre(b), centre(fromRect)));
        if (targets.length > 0) return { fromId, toId: targets[0][0] };
    }
    return null;
}

/**
 * A hand that grabs one Bommel, carries it onto another and lets go, over and over, to show that moving works by drag
 * and drop. Drawn over the tree without catching any pointer events, so the cards stay usable underneath. The positions
 * are taken from the cards on screen and measured again before each round, so panning or zooming is picked up.
 */
export function DragHint({ containerRef, tree, preferred }: DragHintProps) {
    const [geometry, setGeometry] = useState<Geometry | null>(null);

    const measure = useCallback(() => {
        const container = containerRef.current;
        if (!container) return;
        const box = container.getBoundingClientRect();
        const cards = new Map<number, DOMRect>();
        container.querySelectorAll<HTMLElement>('[data-bommel-id]').forEach((card) => cards.set(Number(card.dataset.bommelId), card.getBoundingClientRect()));
        const move = pickMove(cards, box, tree, preferred);
        const source = move && tree.find((n) => n.id === move.fromId);
        if (!move || !source) {
            setGeometry(null);
            return;
        }
        const from = cards.get(move.fromId)!;
        const to = cards.get(move.toId)!;
        const x = from.left - box.left + from.width / 2;
        const y = from.top - box.top + from.height / 2;
        setGeometry({
            name: source.text,
            emoji: source.data?.emoji ?? '',
            x,
            y,
            dx: to.left - box.left + to.width / 2 - x,
            dy: to.top - box.top + to.height / 2 - y,
            target: { left: to.left - box.left, top: to.top - box.top, width: to.width, height: to.height },
        });
    }, [containerRef, tree, preferred]);

    // The tree is fitted to the canvas in its first frames; measure once it has settled, and again on resize
    useEffect(() => {
        const timer = setTimeout(measure, 150);
        window.addEventListener('resize', measure);
        return () => {
            clearTimeout(timer);
            window.removeEventListener('resize', measure);
        };
    }, [measure]);

    // Nothing to show yet (no two cards in view): look again now and then, the user may pan or expand a branch
    const hasGeometry = geometry !== null;
    useEffect(() => {
        if (hasGeometry) return;
        const interval = setInterval(measure, 1000);
        return () => clearInterval(interval);
    }, [hasGeometry, measure]);

    if (!geometry) return null;

    const remeasure = (e: React.AnimationEvent) => {
        if (e.animationName === 'drag-hint-path') measure();
    };

    return (
        <div className="drag-hint pointer-events-none absolute inset-0 z-10 overflow-hidden" aria-hidden="true">
            {/* The drop target lights up shortly before the hand lets go, like a real drag over a valid Bommel */}
            <div
                className="drag-hint-target absolute rounded-2xl"
                style={{ left: geometry.target.left, top: geometry.target.top, width: geometry.target.width, height: geometry.target.height }}
            />
            <div
                className="drag-hint-pointer absolute"
                style={
                    {
                        left: geometry.x,
                        top: geometry.y,
                        '--drag-hint-dx': `${geometry.dx}px`,
                        '--drag-hint-dy': `${geometry.dy}px`,
                    } as React.CSSProperties
                }
                onAnimationIteration={remeasure}
            >
                {/* The carried Bommel, offset from the hand like the ghost of a real drag */}
                <div className="drag-hint-ghost absolute left-3 top-4 flex max-w-[180px] items-center gap-2 rounded-xl border border-purple-300 bg-background-secondary px-3 py-2 shadow-lg">
                    {geometry.emoji && (
                        <span className="flex-shrink-0 text-lg">
                            <Emoji emoji={geometry.emoji} />
                        </span>
                    )}
                    <span className="truncate text-sm font-semibold text-foreground">{geometry.name}</span>
                </div>
                <span className="absolute -left-3 -top-2.5 drop-shadow-md">
                    <Hand className="drag-hint-hand-open absolute h-7 w-7" fill="var(--background-secondary)" stroke="var(--font-color)" strokeWidth={1.6} />
                    <HandGrab
                        className="drag-hint-hand-closed absolute h-7 w-7"
                        fill="var(--background-secondary)"
                        stroke="var(--font-color)"
                        strokeWidth={1.6}
                    />
                </span>
            </div>
        </div>
    );
}

export default DragHint;
