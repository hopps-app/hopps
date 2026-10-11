import { Crosshair, Minus, Plus } from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { BommelBranch, BommelCard, Connector } from './components';
import { DragGhostOverlay } from './components/DragGhostOverlay';
import { useBommelDragDrop } from './hooks/useBommelDragDrop';
import { useDragAutoScroll } from './hooks/useDragAutoScroll';
import { useElementSize } from './hooks/useElementSize';
import { useTreeData } from './hooks/useTreeData';
import { useTreeViewport } from './hooks/useTreeViewport';
import { BommelTreeComponentProps, TreeNodeData } from './types';

import { EmptyState } from '@/components/common/EmptyState';
import { useMediaQuery } from '@/hooks/use-media-query';
import { cn } from '@/lib/utils';

const NO_PATH: ReadonlySet<number> = new Set();

/** Ids from `node` down to `targetId`, or null when the target is not in this subtree */
function findPath(node: TreeNodeData, targetId: number): number[] | null {
    const id = node.attributes?.id as number;
    if (id === targetId) return [id];
    for (const child of node.children ?? []) {
        const rest = findPath(child, targetId);
        if (rest) return [id, ...rest];
    }
    return null;
}

/** Below this the tree is drawn top-down with indented children instead of side by side */
const VERTICAL_LAYOUT_QUERY = '(max-width: 767px)';
/** Root and first level start expanded, deeper levels start collapsed */
const DEFAULT_EXPANDED_DEPTH = 2;

function BommelTreeComponent({
    tree,
    rootBommel,
    editable = false,
    dragDropEnabled = false,
    selectedId,
    onNodeClick,
    onEdit,
    onDelete,
    onAddChild,
    onMove,
    onRequestEdit,
    fitExtraWidth = 0,
    className,
}: BommelTreeComponentProps) {
    const { t } = useTranslation();
    const vertical = useMediaQuery(VERTICAL_LAYOUT_QUERY);
    const [treeRef, natural] = useElementSize<HTMLDivElement>();
    // The outer element: drag auto-scroll needs it in both layouts, pan/zoom uses it as the canvas when horizontal
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [container, setContainer] = useState<HTMLDivElement | null>(null);
    const attachContainer = useCallback((element: HTMLDivElement | null) => {
        containerRef.current = element;
        setContainer(element);
    }, []);
    const viewport = useTreeViewport({ canvas: vertical ? null : container, natural, fitExtraWidth });
    // Only nodes the user toggled are stored; everything else follows DEFAULT_EXPANDED_DEPTH
    const [toggled, setToggled] = useState<Map<number, boolean>>(() => new Map());
    const [autoEditNodeId, setAutoEditNodeId] = useState<number | null>(null);

    const { dragState, startDrag, updateDrag, setHoverTarget, endDrag, cancelDrag, hasPendingDrag } = useBommelDragDrop(tree);

    const hoverAt = useCallback(
        (x: number, y: number) => {
            const target = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-bommel-id]');
            setHoverTarget(target ? Number(target.dataset.bommelId) : null);
        },
        [setHoverTarget]
    );
    const trackPointer = useDragAutoScroll(dragState.isDragging, containerRef, hoverAt, vertical ? undefined : viewport.panBy);

    // Global pointer listeners for drag-drop. The drop target is looked up under the pointer rather than via
    // pointerenter on the cards: during a touch drag the browser keeps sending events to the card the finger
    // started on, so enter/leave never fire on the others (iOS in particular).
    useEffect(() => {
        if (!dragDropEnabled) return;

        const handlePointerMove = (e: PointerEvent) => {
            if (!hasPendingDrag()) return;
            updateDrag(e.clientX, e.clientY);
            trackPointer(e.clientX, e.clientY);
            hoverAt(e.clientX, e.clientY);
        };

        const handlePointerUp = () => {
            if (!hasPendingDrag()) return;
            const result = endDrag();
            if (result && onMove) {
                onMove(result.draggedNodeId, result.dropTargetId);
            }
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                cancelDrag();
            }
        };

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
        window.addEventListener('pointercancel', cancelDrag);
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
            window.removeEventListener('pointercancel', cancelDrag);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [dragDropEnabled, updateDrag, trackPointer, hoverAt, endDrag, cancelDrag, hasPendingDrag, onMove]);

    // Clear autoEditNodeId after it has been consumed by the BommelCard
    useEffect(() => {
        if (autoEditNodeId !== null) {
            const timer = setTimeout(() => setAutoEditNodeId(null), 100);
            return () => clearTimeout(timer);
        }
    }, [autoEditNodeId]);

    const treeData = useTreeData({ tree, rootBommel });

    const pathIds = useMemo(() => {
        if (!treeData || selectedId == null) return NO_PATH;
        const path = findPath(treeData, selectedId);
        return path ? new Set(path) : NO_PATH;
    }, [treeData, selectedId]);

    const isExpanded = useCallback(
        (node: TreeNodeData, depth: number) => toggled.get(node.attributes?.id as number) ?? depth < DEFAULT_EXPANDED_DEPTH,
        [toggled]
    );

    const setExpanded = useCallback((nodeId: number, expanded: boolean) => {
        setToggled((prev) => new Map(prev).set(nodeId, expanded));
    }, []);

    // Expanding or collapsing changes the tree's width, so the layout around the clicked card shifts. Keep that card
    // where it was on screen: remember its position, hold the zoom (no refit), and pan by however far it moved.
    const toggleAnchorRef = useRef<{ id: number; x: number; y: number } | null>(null);
    const { holdView, panBy } = viewport;

    const toggleNode = useCallback(
        (nodeId: number, expanded: boolean) => {
            const card = containerRef.current?.querySelector(`[data-bommel-id="${nodeId}"]`);
            if (card && !vertical) {
                const rect = card.getBoundingClientRect();
                toggleAnchorRef.current = { id: nodeId, x: rect.left, y: rect.top };
                holdView();
            }
            setExpanded(nodeId, !expanded);
        },
        [vertical, holdView, setExpanded]
    );

    useLayoutEffect(() => {
        const anchor = toggleAnchorRef.current;
        if (!anchor) return;
        toggleAnchorRef.current = null;
        const card = containerRef.current?.querySelector(`[data-bommel-id="${anchor.id}"]`);
        if (!card) return;
        const rect = card.getBoundingClientRect();
        const dx = anchor.x - rect.left;
        const dy = anchor.y - rect.top;
        if (dx || dy) panBy(dx, dy);
    }, [toggled, panBy]);

    const handleAddChild = useCallback(
        async (nodeId: number) => {
            if (!onAddChild) return false;
            // Open the parent so the new card (which starts in name edit) is visible
            setExpanded(nodeId, true);
            const result = await onAddChild(nodeId);
            if (typeof result === 'number') {
                setAutoEditNodeId(result);
            }
            return result;
        },
        [onAddChild, setExpanded]
    );

    const renderCard = useCallback(
        (node: TreeNodeData, depth: number, expanded: boolean) => {
            const nodeId = node.attributes?.id as number;
            const isHoverTarget = dragState.isDragging && dragState.hoverTargetId === nodeId;

            return (
                <BommelCard
                    node={node}
                    depth={depth}
                    expanded={expanded}
                    fullWidth={vertical}
                    onToggle={() => toggleNode(nodeId, expanded)}
                    selected={selectedId === nodeId}
                    onNodeClick={onNodeClick}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onAddChild={handleAddChild}
                    editable={editable}
                    autoEdit={autoEditNodeId === nodeId}
                    dragDropEnabled={dragDropEnabled}
                    isBeingDragged={dragState.isDragging && dragState.draggedNodeId === nodeId}
                    isDraggedOver={isHoverTarget}
                    isValidDropTarget={isHoverTarget ? !dragState.invalidTargetIds.has(nodeId) : undefined}
                    onDragStart={dragDropEnabled ? startDrag : undefined}
                />
            );
        },
        [dragState, selectedId, onNodeClick, onEdit, onDelete, handleAddChild, editable, autoEditNodeId, dragDropEnabled, startDrag, toggleNode, vertical]
    );

    if (!treeData) {
        return <EmptyState title={t('bommel.noData')} description={t('bommel.addItems')} />;
    }

    const rootId = treeData.attributes?.id as number;
    const rootIsEmpty = !treeData.children?.length;
    const canAddFirst = rootIsEmpty && !!onAddChild && (editable || !!onRequestEdit);

    const layout = vertical ? 'vertical' : 'horizontal';
    const content = rootIsEmpty ? (
        <div className={cn('flex flex-col', !vertical && 'items-center')}>
            {renderCard(treeData, 0, true)}
            {canAddFirst && (
                <>
                    <Connector className={cn(vertical && 'ml-5')} />
                    <button
                        type="button"
                        onClick={() => (editable ? handleAddChild(rootId) : onRequestEdit?.())}
                        className={cn(
                            'flex items-center justify-center gap-2 px-[15px] py-[18px] rounded-2xl border-2 border-dashed border-purple-500 bg-[var(--accent-surface)] text-purple-600 text-[14px] font-extrabold',
                            vertical ? 'w-full' : 'w-[224px]'
                        )}
                    >
                        <Plus className="w-[17px] h-[17px]" strokeWidth={2.4} aria-hidden="true" />
                        {t('bommel.addSibling')}
                    </button>
                </>
            )}
        </div>
    ) : (
        <BommelBranch node={treeData} depth={0} layout={layout} pathIds={pathIds} isExpanded={isExpanded} renderCard={renderCard} />
    );

    const controlClass =
        'w-8 h-8 grid place-items-center text-muted-foreground hover:text-foreground hover:bg-[var(--surface-sunken)] disabled:opacity-40 disabled:pointer-events-none';

    return (
        <div
            ref={attachContainer}
            className={cn(
                'relative font-hanken rounded-[18px] border border-border-soft bg-[var(--surface-sunken)]',
                // Horizontal: a pan/zoom surface. `contain: size` keeps the tree out of the page's height calculation,
                // so the canvas takes the height the page gives it (at least 420px) instead of growing with the tree.
                vertical
                    ? 'px-3 pt-4 pb-5'
                    : cn('min-h-[420px] overflow-hidden [contain:size] touch-none select-none', viewport.isPanning ? 'cursor-grabbing' : 'cursor-grab'),
                dragState.isDragging && 'select-none',
                className
            )}
            {...(vertical ? {} : viewport.handlers)}
        >
            {vertical ? (
                content
            ) : (
                <>
                    <div
                        ref={treeRef}
                        className="absolute left-0 top-0 w-max origin-top-left"
                        // Hidden for the first frame, until the canvas and the tree have been measured and the fit is known
                        style={{ transform: viewport.transform, visibility: viewport.ready ? undefined : 'hidden' }}
                    >
                        {content}
                    </div>

                    <div className="absolute top-3 right-3 z-20 flex flex-col divide-y divide-border-soft overflow-hidden rounded-[10px] border border-border-soft bg-background-secondary shadow-[var(--shadow-sm)]">
                        <button
                            type="button"
                            onClick={viewport.zoomIn}
                            disabled={!viewport.canZoomIn}
                            className={controlClass}
                            title={t('bommel.zoomIn')}
                            aria-label={t('bommel.zoomIn')}
                        >
                            <Plus className="w-4 h-4" aria-hidden="true" />
                        </button>
                        <button
                            type="button"
                            onClick={viewport.zoomOut}
                            disabled={!viewport.canZoomOut}
                            className={controlClass}
                            title={t('bommel.zoomOut')}
                            aria-label={t('bommel.zoomOut')}
                        >
                            <Minus className="w-4 h-4" aria-hidden="true" />
                        </button>
                        <button
                            type="button"
                            onClick={viewport.center}
                            className={controlClass}
                            title={t('bommel.centerTree')}
                            aria-label={t('bommel.centerTree')}
                        >
                            <Crosshair className="w-4 h-4" aria-hidden="true" />
                        </button>
                    </div>
                </>
            )}

            {dragState.isDragging && (
                <DragGhostOverlay
                    name={dragState.draggedNodeName}
                    emoji={dragState.draggedNodeEmoji}
                    x={dragState.pointerX}
                    y={dragState.pointerY}
                    isValidTarget={dragState.hoverTargetId !== null ? !dragState.invalidTargetIds.has(dragState.hoverTargetId) : null}
                />
            )}
        </div>
    );
}

export default BommelTreeComponent;
