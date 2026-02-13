import { useCallback, useEffect, useRef, useState } from 'react';
import Tree, { CustomNodeElementProps } from 'react-d3-tree';
import { useTranslation } from 'react-i18next';

import { BommelCard, TreeStyles } from './components';
import { MoveBommelDialog } from './components/MoveBommelDialog';
import { useTreeData } from './hooks/useTreeData';
import { BommelTreeComponentProps } from './types';

import { EmptyState } from '@/components/common/EmptyState';

function BommelTreeComponent({
    tree,
    rootBommel,
    editable = false,
    onNodeClick,
    onEdit,
    onDelete,
    onAddChild,
    onMove,
    width = 800,
    height = 600,
}: BommelTreeComponentProps) {
    const { t } = useTranslation();
    const [, forceUpdate] = useState({});
    const treeContainerRef = useRef<HTMLDivElement>(null);
    const [containerWidth, setContainerWidth] = useState(width);
    const [movingBommelId, setMovingBommelId] = useState<number | null>(null);

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

    // Convert OrganizationTreeNodeModel[] to react-d3-tree format
    const treeData = useTreeData({ tree, rootBommel });

    const movingBommel = movingBommelId !== null ? tree.find((n) => n.id === movingBommelId) : null;

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
                const success = await onAddChild(nodeId);
                if (success) {
                    forceUpdate({});
                }
                return success;
            }
            return false;
        },
        [onAddChild]
    );

    const handleMoveClick = useCallback(
        (nodeId: number) => {
            setMovingBommelId(nodeId);
        },
        []
    );

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
            return (
                <g>
                    <foreignObject x={-100} y={editable ? -40 : -45} width={200} height={editable ? 80 : 90} style={{ overflow: 'visible' }}>
                        <BommelCard
                            nodeDatum={nodeDatum}
                            toggleNode={toggleNode}
                            onNodeClick={onNodeClick}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            onAddChild={handleAddChild}
                            onMove={onMove ? handleMoveClick : undefined}
                            editable={editable}
                        />
                    </foreignObject>
                </g>
            );
        },
        [editable, handleEdit, handleDelete, handleAddChild, handleMoveClick, onNodeClick, onMove]
    );

    if (!treeData) {
        return <EmptyState title={t('organization.structure.noData')} description={t('organization.structure.addItems')} />;
    }

    return (
        <div ref={treeContainerRef} className="w-full border rounded-lg bg-gradient-to-br from-gray-50 to-gray-100 relative" style={{ height }}>
            <div className="w-full h-full overflow-hidden">
                <Tree
                    data={treeData}
                    orientation="vertical"
                    translate={{ x: containerWidth / 2, y: 80 }}
                    pathFunc="step"
                    nodeSize={{ x: 240, y: editable ? 130 : 140 }}
                    renderCustomNodeElement={renderCustomNodeElement}
                    separation={{ siblings: 1, nonSiblings: 1.2 }}
                    zoom={0.9}
                    scaleExtent={{ min: 0.3, max: 2 }}
                    enableLegacyTransitions={true}
                    collapsible={true}
                    initialDepth={3}
                    depthFactor={editable ? 130 : 140}
                    pathClassFunc={() => 'tree-link'}
                />
            </div>
            <TreeStyles />

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
