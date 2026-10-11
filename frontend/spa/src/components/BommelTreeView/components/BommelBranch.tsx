import { ReactNode, useLayoutEffect, useRef, useState } from 'react';

import { TreeNodeData } from '../types';

import { cn } from '@/lib/utils';

const LINE = 'bg-[var(--border-soft)]';
/** Connectors on the way from the root to the selected Bommel */
const PATH_LINE = 'bg-purple-500';

/** Vertical connector between a card and what hangs below it */
export function Connector({ className, onPath }: { className?: string; onPath?: boolean }) {
    return <span aria-hidden="true" className={cn('block w-0.5 h-5 flex-shrink-0', onPath ? PATH_LINE : LINE, className)} />;
}

export type TreeLayout = 'horizontal' | 'vertical';

interface BommelBranchProps {
    node: TreeNodeData;
    depth: number;
    layout: TreeLayout;
    /** Ids from the root down to the selected Bommel; their connectors are drawn in purple */
    pathIds: ReadonlySet<number>;
    isExpanded: (node: TreeNodeData, depth: number) => boolean;
    renderCard: (node: TreeNodeData, depth: number, expanded: boolean) => ReactNode;
}

/**
 * One node and, when expanded, its children. Plain flexbox: the browser positions every card from its real
 * size, and the connector lines are elements in the same layout.
 *
 * - horizontal: children side by side under their parent (org chart), for tablets and desktop
 * - vertical: children stacked below their parent and indented, joined by a rail on the left, for phones
 */
export function BommelBranch({ node, depth, layout, pathIds, isExpanded, renderCard }: BommelBranchProps) {
    const children = node.children ?? [];
    const expanded = isExpanded(node, depth);
    const showChildren = expanded && children.length > 0;
    // The child the selection path continues through, -1 when the path ends here or does not pass this node
    const pathIndex = showChildren ? children.findIndex((child) => pathIds.has(child.attributes?.id as number)) : -1;

    // Horizontal layout: the purple stretch of the rail runs from under this card (the row's centre) to the centre of
    // the path child. Where that child sits depends on its siblings' subtrees, so it is measured, and re-measured
    // whenever the row resizes (a branch expanding or collapsing).
    const rowRef = useRef<HTMLDivElement>(null);
    const pathChildRef = useRef<HTMLDivElement>(null);
    const [pathRail, setPathRail] = useState<{ left: number; width: number } | null>(null);

    useLayoutEffect(() => {
        const row = rowRef.current;
        const child = pathChildRef.current;
        if (layout !== 'horizontal' || pathIndex < 0 || !row || !child) return;

        const measure = () => {
            const rowCentre = row.offsetWidth / 2;
            const childCentre = child.offsetLeft + child.offsetWidth / 2;
            const left = Math.min(rowCentre, childCentre) - 1;
            const width = Math.abs(rowCentre - childCentre) + 2;
            setPathRail((prev) => (prev && prev.left === left && prev.width === width ? prev : { left, width }));
        };

        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(row);
        return () => observer.disconnect();
    }, [layout, pathIndex]);

    const branch = (child: TreeNodeData) => (
        <BommelBranch node={child} depth={depth + 1} layout={layout} pathIds={pathIds} isExpanded={isExpanded} renderCard={renderCard} />
    );

    if (layout === 'vertical') {
        return (
            <div className="flex flex-col">
                {renderCard(node, depth, expanded)}
                {showChildren && (
                    <div className="flex flex-col gap-3.5 mt-3.5 pl-8">
                        {children.map((child, index) => {
                            const isLast = index === children.length - 1;
                            return (
                                <div key={child.attributes?.id ?? child.name} className="relative">
                                    {/* Rail from the card above down to this child's elbow, running on past it while more siblings follow.
                                        It sits 20px in from the parent's edge, clear of the card's 16px corner radius.
                                        Siblings above the path child carry the path through their whole segment. */}
                                    <span
                                        aria-hidden="true"
                                        className={cn(
                                            'absolute -left-3 -top-3.5 w-0.5',
                                            isLast ? 'h-[41px]' : 'bottom-0',
                                            index < pathIndex ? PATH_LINE : LINE
                                        )}
                                    />
                                    <span aria-hidden="true" className={cn('absolute -left-3 top-[25px] w-3 h-0.5', index === pathIndex ? PATH_LINE : LINE)} />
                                    {/* On the path child the path stops at its elbow, the rail below it stays grey */}
                                    {index === pathIndex && !isLast && (
                                        <span aria-hidden="true" className={cn('absolute -left-3 -top-3.5 w-0.5 h-[41px]', PATH_LINE)} />
                                    )}
                                    {branch(child)}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center">
            {renderCard(node, depth, expanded)}
            {showChildren && (
                <>
                    <Connector onPath={pathIndex >= 0} />
                    <div ref={rowRef} className="relative flex items-start">
                        {children.map((child, index) => (
                            <div
                                key={child.attributes?.id ?? child.name}
                                ref={index === pathIndex ? pathChildRef : undefined}
                                className="relative flex flex-col items-center px-[9px]"
                            >
                                {/* Each child draws its half of the horizontal rail; the outer halves of the first and last stay empty */}
                                {index > 0 && <span aria-hidden="true" className={cn('absolute top-0 left-0 w-1/2 h-0.5', LINE)} />}
                                {index < children.length - 1 && <span aria-hidden="true" className={cn('absolute top-0 right-0 w-1/2 h-0.5', LINE)} />}
                                <Connector onPath={index === pathIndex} />
                                {branch(child)}
                            </div>
                        ))}
                        {pathIndex >= 0 && pathRail && (
                            <span
                                aria-hidden="true"
                                className={cn('absolute top-0 h-0.5 z-[1]', PATH_LINE)}
                                style={{ left: pathRail.left, width: pathRail.width }}
                            />
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

export default BommelBranch;
