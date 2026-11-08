import { type RefObject, useEffect, useId, useRef, useState } from 'react';

import { BommelTreeNodeModel } from '@/components/BommelTreeView/BommelTreeNodeModel';

interface SumFlowHintProps {
    /** The element the hint is drawn over; it must be positioned and contain the tree's cards */
    containerRef: RefObject<HTMLElement | null>;
    tree: BommelTreeNodeModel[];
    /** The tree is drawn top-down with indented children (phones) instead of side by side */
    vertical: boolean;
    /** `guide`: the guide's attention colour while it explains the sums; otherwise a quiet purple */
    tone?: 'default' | 'guide';
}

interface Segment {
    d: string;
    /** Ends at the parent card: gets the arrowhead */
    arrow: boolean;
}

/** The tree's connectors, see BommelBranch: 20px from a card down to the rail, 20px from the rail to each child. */
const VERTICAL_RAIL_INSET = 21;
const VERTICAL_ELBOW_TOP = 26;

/**
 * Flowing arrows on the connector lines, from every Bommel up to the one above it, to show that the amounts are added up
 * from the bottom to the top. Only the cards on screen are joined (collapsed branches are skipped). The positions are
 * read from the cards whenever the tree changes on screen (panning and zooming change its transform, expanding adds
 * cards), at most once per frame.
 */
export function SumFlowHint({ containerRef, tree, vertical, tone = 'default' }: SumFlowHintProps) {
    const [segments, setSegments] = useState<Segment[]>([]);
    const svgRef = useRef<SVGSVGElement>(null);
    const markerId = useId();

    useEffect(() => {
        const rootId = tree.find((n) => n.data?.isRoot)?.id;
        // The tree model hangs the top level under 0; on screen it hangs under the root card
        const parentOf = new Map(tree.filter((n) => !n.data?.isRoot).map((n) => [Number(n.id), Number(n.parent === 0 ? rootId : n.parent)]));
        let frame = 0;
        let last = '';

        const measure = () => {
            const container = containerRef.current;
            if (!container) return;
            const box = container.getBoundingClientRect();
            const rects = new Map<number, DOMRect>();
            container
                .querySelectorAll<HTMLElement>('[data-bommel-id]')
                .forEach((card) => rects.set(Number(card.dataset.bommelId), card.getBoundingClientRect()));

            // Children on screen, grouped by their parent
            const childrenOf = new Map<number, DOMRect[]>();
            for (const [id, rect] of rects) {
                const parentId = parentOf.get(id);
                if (parentId === undefined || !rects.has(parentId)) continue;
                childrenOf.set(parentId, [...(childrenOf.get(parentId) ?? []), rect]);
            }

            const next: Segment[] = [];
            const x = (value: number) => Math.round(value - box.left);
            const y = (value: number) => Math.round(value - box.top);
            for (const [parentId, children] of childrenOf) {
                const parent = rects.get(parentId)!;
                if (vertical) {
                    // Each child's elbow runs left into the rail, the rail runs up into the parent
                    const railX = x(parent.left) + VERTICAL_RAIL_INSET;
                    let lowest = 0;
                    for (const child of children) {
                        const elbowY = y(child.top) + VERTICAL_ELBOW_TOP;
                        lowest = Math.max(lowest, elbowY);
                        next.push({ d: `M${x(child.left)},${elbowY} H${railX}`, arrow: false });
                    }
                    next.push({ d: `M${railX},${lowest} V${y(parent.bottom)}`, arrow: true });
                } else {
                    // Each child's stub runs up to the rail, the rail runs in from both ends, the trunk up into the parent
                    const parentX = x(parent.left + parent.width / 2);
                    const railY = Math.round((y(parent.bottom) + Math.min(...children.map((c) => y(c.top)))) / 2);
                    const xs = children.map((c) => x(c.left + c.width / 2));
                    for (const [i, child] of children.entries()) next.push({ d: `M${xs[i]},${y(child.top)} V${railY}`, arrow: false });
                    const left = Math.min(...xs);
                    const right = Math.max(...xs);
                    if (left < parentX) next.push({ d: `M${left},${railY} H${parentX}`, arrow: false });
                    if (right > parentX) next.push({ d: `M${right},${railY} H${parentX}`, arrow: false });
                    next.push({ d: `M${parentX},${railY} V${y(parent.bottom)}`, arrow: true });
                }
            }

            const signature = next.map((s) => s.d).join('|');
            if (signature !== last) {
                last = signature;
                setSegments(next);
            }
        };

        const schedule = () => {
            if (!frame)
                frame = requestAnimationFrame(() => {
                    frame = 0;
                    measure();
                });
        };
        // Branches slide in when expanded; measure again once that has finished
        const timers = new Set<ReturnType<typeof setTimeout>>();
        const scheduleSettled = () => {
            schedule();
            const timer = setTimeout(() => {
                timers.delete(timer);
                schedule();
            }, 250);
            timers.add(timer);
        };

        const container = containerRef.current;
        // The arrows' own changes do not count, they would only trigger the next measure
        const mutations = new MutationObserver((records) => {
            if (records.some((r) => !svgRef.current?.contains(r.target))) scheduleSettled();
        });
        const resizes = new ResizeObserver(schedule);
        if (container) {
            mutations.observe(container, { subtree: true, childList: true, attributes: true, attributeFilter: ['style', 'class'] });
            resizes.observe(container);
        }
        window.addEventListener('resize', schedule);
        scheduleSettled();

        return () => {
            cancelAnimationFrame(frame);
            timers.forEach(clearTimeout);
            mutations.disconnect();
            resizes.disconnect();
            window.removeEventListener('resize', schedule);
        };
    }, [containerRef, tree, vertical]);

    if (segments.length === 0) return null;

    return (
        <svg ref={svgRef} className={`sum-flow sum-flow--${tone} pointer-events-none absolute inset-0 z-10 h-full w-full overflow-hidden`} aria-hidden="true">
            <defs>
                <marker id={markerId} viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                    <path d="M1,1 L9,5 L1,9" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </marker>
            </defs>
            {segments.map((segment) => (
                <path key={segment.d} d={segment.d} className="sum-flow-line" markerEnd={segment.arrow ? `url(#${markerId})` : undefined} />
            ))}
        </svg>
    );
}

export default SumFlowHint;
