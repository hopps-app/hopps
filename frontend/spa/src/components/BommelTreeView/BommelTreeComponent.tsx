import { useCallback, useRef, useState } from 'react';
import Tree, { CustomNodeElementProps } from 'react-d3-tree';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/common/EmptyState';

import { BommelCard, TreeStyles } from './components';
import { useTreeData } from './hooks/useTreeData';
import { BommelTreeComponentProps } from './types';

function BommelTreeComponent({
    tree,
    rootBommel,
    editable = false,
    onNodeClick,
    onEdit,
    onDelete,
    onAddChild,
    width = 800,
    height = 600,
}: BommelTreeComponentProps) {
    const { t } = useTranslation();
    const [, forceUpdate] = useState({});
    const treeContainerRef = useRef<HTMLDivElement>(null);

    // Convert OrganizationTreeNodeModel[] to react-d3-tree format
    const treeData = useTreeData({ tree, rootBommel });

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

    const renderCustomNodeElement = useCallback(
        ({ nodeDatum, toggleNode }: CustomNodeElementProps) => {
            return (
                <g>
                    <foreignObject x={-100} y={-60} width={200} height={editable ? 80 : 120} style={{ overflow: 'visible' }}>
                        <BommelCard
                            nodeDatum={nodeDatum}
                            toggleNode={toggleNode}
                            onNodeClick={onNodeClick}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            onAddChild={handleAddChild}
                            editable={editable}
                        />
                    </foreignObject>
                </g>
            );
        },
        [editable, handleEdit, handleDelete, handleAddChild, onNodeClick]
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
                    translate={{ x: width / 2, y: 80 }}
                    pathFunc="step"
                    nodeSize={{ x: 240, y: editable ? 120 : 160 }}
                    renderCustomNodeElement={renderCustomNodeElement}
                    separation={{ siblings: 1, nonSiblings: 1.2 }}
                    zoom={0.9}
                    scaleExtent={{ min: 0.3, max: 2 }}
                    enableLegacyTransitions={true}
                    collapsible={true}
                    initialDepth={3}
                    depthFactor={editable ? 120 : 160}
                    pathClassFunc={() => 'tree-link'}
                />
            </div>
            <TreeStyles />
        </div>
    );
}

export default BommelTreeComponent;
