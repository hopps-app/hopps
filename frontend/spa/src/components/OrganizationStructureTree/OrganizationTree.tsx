import { Tree, getBackendOptions, MultiBackend, NodeModel } from '@minoru/react-dnd-treeview';
import { DndProvider } from 'react-dnd';
import { useState } from 'react';

import OrganizationTreeNode from '@/components/OrganizationStructureTree/OrganizationTreeNode.tsx';
import OrganizationTreeDropPreview from '@/components/OrganizationStructureTree/OrganizationTreeDropPreview.tsx';
import OrganizationTreePlaceholder from '@/components/OrganizationStructureTree/OrganizationTreePlaceholder.tsx';
import Button from '@/components/ui/Button.tsx';
import { getMaxId } from '@/components/OrganizationStructureTree/OrganizationTreeUtils.ts';

interface OrganizationStructureTreeProps {
    tree: NodeModel[];
    onTreeChanged?: (tree: NodeModel[]) => void;
}

function OrganizationTree({ tree, onTreeChanged }: OrganizationStructureTreeProps) {
    const [treeData, setTreeData] = useState<NodeModel[]>(JSON.parse(JSON.stringify(tree)));
    const handleDrop = (newTree: NodeModel[]) => {
        setTreeData(newTree);
        onTreeChanged?.(newTree);
    };
    const onClickCreate = () => {
        const newTree = [...treeData, { id: getMaxId(treeData) + 1, parent: 0, text: 'New item', droppable: true }];
        setTreeData(newTree);
        onTreeChanged?.(newTree);
    };

    const onDeleteNode = (id: NodeModel['id']) => {
        const newTree = treeData.filter((node) => node.id !== id);
        setTreeData(newTree);
        onTreeChanged?.(newTree);
    };

    const onEditNode = (id: NodeModel['id'], text: string) => {
        const newTree = treeData.map((node) => (node.id === id ? { ...node, text } : node));
        setTreeData(newTree);
        onTreeChanged?.(newTree);
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
                    render={(node, options) => <OrganizationTreeNode node={node} onEdit={onEditNode} onDelete={onDeleteNode} {...options} />}
                    dragPreviewRender={(monitorProps) => <OrganizationTreeDropPreview monitorProps={monitorProps} />}
                    placeholderRender={(node, { depth }) => <OrganizationTreePlaceholder node={node} depth={depth} />}
                    onDrop={handleDrop}
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
