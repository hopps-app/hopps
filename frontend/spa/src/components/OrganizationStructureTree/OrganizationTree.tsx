import { Tree, getBackendOptions, MultiBackend } from '@minoru/react-dnd-treeview';
import { DndProvider } from 'react-dnd';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import OrganizationTreeNode from '@/components/OrganizationStructureTree/OrganizationTreeNode.tsx';
import OrganizationTreeDropPreview from '@/components/OrganizationStructureTree/OrganizationTreeDropPreview.tsx';
import OrganizationTreePlaceholder from '@/components/OrganizationStructureTree/OrganizationTreePlaceholder.tsx';
import Button from '@/components/ui/Button.tsx';
import { getMaxId } from '@/components/OrganizationStructureTree/OrganizationTreeUtils';
import { OrganizationTreeNodeModel } from '@/components/OrganizationStructureTree/OrganizationTreeNodeModel.ts';

interface OrganizationStructureTreeProps {
    tree: OrganizationTreeNodeModel[];
    editable?: boolean;
    selectable?: boolean;
    onTreeChanged?: (tree: OrganizationTreeNodeModel[]) => void;
    onSelect?: (id: number) => void;
}

function OrganizationTree({ tree, editable, selectable, onTreeChanged, onSelect }: OrganizationStructureTreeProps) {
    const { t } = useTranslation();
    const [treeData, setTreeData] = useState<OrganizationTreeNodeModel[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [selectedNode, setSelectedNode] = useState<OrganizationTreeNodeModel | null>(null);
    const isEditable = editable ?? false;
    const isSelectable = selectable ?? false;

    const handleDrop = (newTree: OrganizationTreeNodeModel[]) => {
        setTreeData(newTree);
        onTreeChanged?.(newTree);
    };
    const onClickCreate = () => {
        const newTree = [
            ...treeData,
            {
                id: getMaxId(treeData) + 1,
                parent: 0,
                text: 'New item',
                droppable: true,
                data: { emoji: '', isNew: true },
            },
        ];
        setTreeData(newTree);
        onTreeChanged?.(newTree);
    };

    const onDeleteNode = (id: OrganizationTreeNodeModel['id']) => {
        const newTree = treeData.filter((node) => node.id !== id);
        setTreeData(newTree);
        onTreeChanged?.(newTree);
    };
    const onSelectNode = (node: OrganizationTreeNodeModel) => {
        setSelectedNode(node);
        onSelect?.(node.id as number);
    };

    const onEditNode = (node: OrganizationTreeNodeModel) => {
        const newTree = treeData.map((item) => (item.id === node.id ? node : item));
        setTreeData(newTree);
        onTreeChanged?.(newTree);
    };

    const onDragStart = () => {
        setIsDragging(true);
    };

    const onDragEnd = () => {
        setIsDragging(false);
    };

    useEffect(() => {
        setTreeData(tree);
    }, [tree]);

    return (
        <DndProvider backend={MultiBackend} options={getBackendOptions()}>
            <div>
                {treeData.length ? (
                    <Tree
                        tree={treeData}
                        rootId={0}
                        sort={false}
                        dropTargetOffset={10}
                        initialOpen={true}
                        canDrag={() => isEditable}
                        canDrop={(_, { dragSource, dropTargetId }) => {
                            if (!isEditable) return false;
                            if (dragSource?.parent === dropTargetId) {
                                return true;
                            }
                        }}
                        render={(node, options) => (
                            <OrganizationTreeNode
                                node={node}
                                editable={isEditable}
                                selectable={isSelectable}
                                isSelected={node.id === selectedNode?.id}
                                onEdit={onEditNode}
                                onDelete={onDeleteNode}
                                onSelect={onSelectNode}
                                disableHover={isDragging}
                                {...options}
                            />
                        )}
                        dragPreviewRender={(monitorProps) => <OrganizationTreeDropPreview monitorProps={monitorProps} />}
                        placeholderRender={(node, { depth }) => <OrganizationTreePlaceholder node={node} depth={depth} />}
                        onDrop={handleDrop}
                        onDragStart={onDragStart}
                        onDragEnd={onDragEnd}
                        classes={{
                            draggingSource: 'opacity-30',
                            placeholder: 'relative',
                            dropTarget: 'bg-accent',
                        }}
                    />
                ) : null}
                {isEditable && (
                    <div className="text-center">
                        <Button variant="link" icon="Plus" onClick={onClickCreate}>
                            {t('organizationTree.createNode')}
                        </Button>
                    </div>
                )}
            </div>
        </DndProvider>
    );
}

export default OrganizationTree;
