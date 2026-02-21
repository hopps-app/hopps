import { Crosshair } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import Tree, { CustomNodeElementProps } from 'react-d3-tree';
import { useTranslation } from 'react-i18next';

import { BommelCard, TreeStyles } from './components';
import { DragGhostOverlay } from './components/DragGhostOverlay';
import { MoveBommelDialog } from './components/MoveBommelDialog';
import { useBommelDragDrop } from './hooks/useBommelDragDrop';
import { useTreeData } from './hooks/useTreeData';
import { BommelTreeComponentProps } from './types';

import { EmptyState } from '@/components/common/EmptyState';

function BommelTreeComponent({
    tree,
    rootBommel,
    editable = false,
    dragDropEnabled = false,
    onNodeClick,
    onEdit,
    onDelete,
    onAddChild,
    onMove,
    width = 800,
    height,
}: BommelTreeComponentProps) {
    const { t } = useTranslation();
    const [, forceUpdate] = useState({});
    const treeContainerRef = useRef<HTMLDivElement>(null);
    const [containerWidth, setContainerWidth] = useState(width);
    const [movingBommelId, setMovingBommelId] = useState<number | null>(null);
    const [autoEditNodeId, setAutoEditNodeId] = useState<number | null>(null);
    const [centerKey, setCenterKey] = useState(0);

    const { dragState, startDrag, updateDrag, setHoverTarget, clearHoverTarget, endDrag, cancelDrag, hasPendingDrag } =
        useBommelDragDrop(tree);

    // Global pointermove/pointerup listeners for drag-drop
    useEffect(() => {
        if (!dragDropEnabled) return;

        const handlePointerMove = (e: PointerEvent) => {
            updateDrag(e.clientX, e.clientY);
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
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [dragDropEnabled, updateDrag, endDrag, cancelDrag, hasPendingDrag, onMove]);

    // Measure container width for responsive centering
    useEffect(() => {
        const container = treeContainerRef.current;
        if (!container) return;

        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                setContainerWidth(entry.contentRect.width);
            }
        });
        observer.observe(container);
        setContainerWidth(container.clientWidth);

        return () => observer.disconnect();
    }, []);

    // Clear autoEditNodeId after it has been consumed by the BommelCard
    useEffect(() => {
        if (autoEditNodeId !== null) {
            const timer = setTimeout(() => setAutoEditNodeId(null), 100);
            return () => clearTimeout(timer);
        }
    }, [autoEditNodeId]);

    // Convert OrganizationTreeNodeModel[] to react-d3-tree format
    const treeData = useTreeData({ tree, rootBommel });

    const movingBommel = movingBommelId !== null ? tree.find((n) => n.id === movingBommelId) : null;

    const handleCenterTree = useCallback(() => {
        setCenterKey((prev) => prev + 1);
    }, []);

    const handleEdit = useCallback(
        async (nodeId: number, newName: string, newEmoji?: string) => {
            if (onEdit) {
                const success = await onEdit(nodeId, newName, newEmoji);
                if (success) {
                    forceUpdate({});
                }
                return success;
            }
            return false;
        },
        [onEdit]
    );

    const handleDelete = useCallback(
        async (nodeId: number) => {
            if (onDelete) {
                const success = await onDelete(nodeId);
                if (success) {
                    forceUpdate({});
                }
                return success;
            }
            return false;
        },
        [onDelete]
    );

    const handleAddChild = useCallback(
        async (nodeId: number) => {
            if (onAddChild) {
                const result = await onAddChild(nodeId);
                if (result) {
                    forceUpdate({});
                    if (typeof result === 'number') {
                        setAutoEditNodeId(result);
                    }
                }
                return result;
            }
            return false;
        },
        [onAddChild]
    );

    const handleMoveClick = useCallback((nodeId: number) => {
        setMovingBommelId(nodeId);
    }, []);

    const handleMoveConfirm = useCallback(
        async (newParentId: number) => {
            if (onMove && movingBommelId !== null) {
                const success = await onMove(movingBommelId, newParentId);
                if (success) {
                    forceUpdate({});
                }
            }
            setMovingBommelId(null);
        },
        [onMove, movingBommelId]
    );

    const handleMoveCancel = useCallback(() => {
        setMovingBommelId(null);
    }, []);

    const renderCustomNodeElement = useCallback(
        ({ nodeDatum, toggleNode }: CustomNodeElementProps) => {
            const nodeId = nodeDatum.attributes?.id as number;
            const isBeingDragged = dragState.isDragging && dragState.draggedNodeId === nodeId;
            const isDraggedOver = dragState.isDragging && dragState.hoverTargetId === nodeId;
            const isValidDropTarget = dragState.isDragging && dragState.hoverTargetId === nodeId ? !dragState.invalidTargetIds.has(nodeId) : undefined;
            const shouldAutoEdit = autoEditNodeId === nodeId;

            return (
                <g>
                    <foreignObject x={-100} y={editable ? -30 : -45} width={200} height={editable ? 60 : 90} style={{ overflow: 'visible' }}>
                        <BommelCard
                            nodeDatum={nodeDatum}
                            toggleNode={toggleNode}
                            onNodeClick={onNodeClick}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            onAddChild={handleAddChild}
                            onMove={onMove ? handleMoveClick : undefined}
                            editable={editable}
                            autoEdit={shouldAutoEdit}
                            dragDropEnabled={dragDropEnabled}
                            isBeingDragged={isBeingDragged}
                            isDraggedOver={isDraggedOver}
                            isValidDropTarget={isValidDropTarget}
                            onDragStart={dragDropEnabled ? startDrag : undefined}
                            onDragEnter={dragState.isDragging ? setHoverTarget : undefined}
                            onDragLeave={dragState.isDragging ? clearHoverTarget : undefined}
                        />
                    </foreignObject>
                </g>
            );
        },
        [editable, dragDropEnabled, dragState, autoEditNodeId, handleEdit, handleDelete, handleAddChild, handleMoveClick, onNodeClick, onMove, startDrag, setHoverTarget, clearHoverTarget]
    );

    if (!treeData) {
        return <EmptyState title={t('organization.structure.noData')} description={t('organization.structure.addItems')} />;
    }

    return (
        <div
            ref={treeContainerRef}
            className={`w-full h-full border rounded-[30px] bg-gradient-to-br from-gray-50 to-gray-100 relative ${dragState.isDragging ? 'select-none' : ''}`}
            style={height ? { height } : undefined}
        >
            {/* Center tree button */}
            <button
                type="button"
                onClick={handleCenterTree}
                className="absolute top-3 right-3 z-10 bg-white border border-gray-300 rounded-lg p-2 shadow-sm hover:bg-gray-50 hover:shadow-md transition-all"
                title={t('organization.structure.centerTree')}
                aria-label={t('organization.structure.centerTree')}
            >
                <Crosshair className="w-4 h-4 text-gray-600" aria-hidden="true" />
            </button>

            <div className="w-full h-full overflow-hidden">
                <Tree
                    key={centerKey}
                    data={treeData}
                    orientation="vertical"
                    translate={{ x: containerWidth / 2, y: 80 }}
                    pathFunc="step"
                    nodeSize={{ x: 240, y: editable ? 100 : 140 }}
                    renderCustomNodeElement={renderCustomNodeElement}
                    separation={{ siblings: 1, nonSiblings: 1.2 }}
                    zoom={0.9}
                    scaleExtent={{ min: 0.3, max: 2 }}
                    enableLegacyTransitions={false}
                    collapsible={true}
                    depthFactor={editable ? 100 : 140}
                    pathClassFunc={() => 'tree-link'}
                    hasInteractiveNodes={dragDropEnabled}
                    draggable={!dragState.isDragging}
                />
            </div>
            <TreeStyles />

            {/* Drag Ghost Overlay */}
            {dragState.isDragging && (
                <DragGhostOverlay
                    name={dragState.draggedNodeName}
                    emoji={dragState.draggedNodeEmoji}
                    x={dragState.pointerX}
                    y={dragState.pointerY}
                    isValidTarget={dragState.hoverTargetId !== null ? !dragState.invalidTargetIds.has(dragState.hoverTargetId) : null}
                />
            )}

            {/* Move Bommel Dialog */}
            {movingBommel && (
                <MoveBommelDialog
                    open={movingBommelId !== null}
                    bommelId={movingBommelId!}
                    bommelName={movingBommel.text}
                    currentParentId={movingBommel.parent}
                    allBommels={tree}
                    onConfirm={handleMoveConfirm}
                    onCancel={handleMoveCancel}
                />
            )}
        </div>
    );
}

export default BommelTreeComponent;
