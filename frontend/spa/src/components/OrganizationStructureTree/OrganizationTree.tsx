import { Tree, getBackendOptions, MultiBackend } from '@minoru/react-dnd-treeview';
import { DndProvider } from 'react-dnd';
import { useState } from 'react';

import OrganizationTreeNode from '@/components/OrganizationStructureTree/OrganizationTreeNode.tsx';
import OrganizationTreeDropPreview from '@/components/OrganizationStructureTree/OrganizationTreeDropPreview.tsx';
import OrganizationTreePlaceholder from '@/components/OrganizationStructureTree/OrganizationTreePlaceholder.tsx';
import Button from '@/components/ui/Button.tsx';
import { getMaxId } from '@/components/OrganizationStructureTree/OrganizationTreeUtils';
import { OrganizationTreeNodeModel } from '@/components/OrganizationStructureTree/OrganizationTreeNodeModel.ts';

interface OrganizationStructureTreeProps {
    tree: OrganizationTreeNodeModel[];
    onTreeChanged?: (tree: OrganizationTreeNodeModel[]) => void;
}

function OrganizationTree({ tree, onTreeChanged }: OrganizationStructureTreeProps) {
    const [treeData, setTreeData] = useState<OrganizationTreeNodeModel[]>(JSON.parse(JSON.stringify(tree)));
    const [isDragging, setIsDragging] = useState(false);

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

    return (
        <DndProvider backend={MultiBackend} options={getBackendOptions()}>
            <div>
                <Tree
                    tree={treeData}
                    rootId={0}
                    sort={false}
                    dropTargetOffset={10}
                    initialOpen={true}
                    canDrop={(_, { dragSource, dropTargetId }) => {
                        if (dragSource?.parent === dropTargetId) {
                            return true;
                        }
                    }}
                    render={(node, options) => (
                        <OrganizationTreeNode node={node} onEdit={onEditNode} onDelete={onDeleteNode} disableHover={isDragging} {...options} />
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
                <div className="text-center">
                    <Button variant="link" icon="Plus" onClick={onClickCreate}>
                        Add new
                    </Button>
                </div>
            </div>
        </DndProvider>
    );
}

export default OrganizationTree;
