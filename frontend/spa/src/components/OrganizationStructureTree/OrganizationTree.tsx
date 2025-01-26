import { Tree, getBackendOptions, MultiBackend } from '@minoru/react-dnd-treeview';
import { DndProvider } from 'react-dnd';
import { useEffect, useState } from 'react';

import OrganizationTreeNode from '@/components/OrganizationStructureTree/OrganizationTreeNode.tsx';
import OrganizationTreeDropPreview from '@/components/OrganizationStructureTree/OrganizationTreeDropPreview.tsx';
import OrganizationTreePlaceholder from '@/components/OrganizationStructureTree/OrganizationTreePlaceholder.tsx';
import Button from '@/components/ui/Button.tsx';
import { OrganizationTreeNodeModel } from '@/components/OrganizationStructureTree/OrganizationTreeNodeModel.ts';

interface OrganizationStructureTreeProps {
    tree: OrganizationTreeNodeModel[];
    createNode?: () => Promise<OrganizationTreeNodeModel | undefined>;
    deleteNode?: (nodeId: number | string) => Promise<boolean>;
    updateNode?: (node: OrganizationTreeNodeModel) => Promise<boolean>;
    moveNode?: (node: OrganizationTreeNodeModel) => Promise<boolean>;
}

function OrganizationTree({ tree, createNode, deleteNode, updateNode, moveNode }: OrganizationStructureTreeProps) {
    const [treeData, setTreeData] = useState<OrganizationTreeNodeModel[]>([]);
    const [isDragging, setIsDragging] = useState(false);

    const handleDrop = async (newTree: OrganizationTreeNodeModel[]) => {
        let movedNode: OrganizationTreeNodeModel | null = null;

        for (const node of newTree) {
            const oldNode = treeData.find((n) => n.id === node.id);
            if (!oldNode || oldNode.parent === node.parent) continue;

            movedNode = node;
            break;
        }

        if (movedNode) {
            const result = await moveNode?.(movedNode);
            if (!result) return;
            setTreeData(newTree);
        }
    };
    const onClickCreate = async () => {
        const node = await createNode?.();
        if (node) {
            const newTree = [...treeData, node];
            setTreeData(newTree);
        }
    };

    const onDeleteNode = async (id: OrganizationTreeNodeModel['id']) => {
        await deleteNode?.(id);
    };

    const onEditNode = async (node: OrganizationTreeNodeModel) => {
        const newTree = treeData.map((item) => (item.id === node.id ? node : item));
        const result = await updateNode?.(node);

        if (!result) return;

        setTreeData(newTree);
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
                ) : null}
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
