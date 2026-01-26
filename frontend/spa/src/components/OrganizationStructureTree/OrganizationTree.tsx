import { Tree, getBackendOptions, MultiBackend } from '@minoru/react-dnd-treeview';
import { useEffect, useState } from 'react';
import { DndProvider } from 'react-dnd';
import { useTranslation } from 'react-i18next';

import OrganizationTreeDropPreview from '@/components/OrganizationStructureTree/OrganizationTreeDropPreview.tsx';
import OrganizationTreeNode from '@/components/OrganizationStructureTree/OrganizationTreeNode.tsx';
import { OrganizationTreeNodeModel } from '@/components/OrganizationStructureTree/OrganizationTreeNodeModel.ts';
import OrganizationTreePlaceholder from '@/components/OrganizationStructureTree/OrganizationTreePlaceholder.tsx';
import Button from '@/components/ui/Button.tsx';

interface OrganizationStructureTreeProps {
    tree: OrganizationTreeNodeModel[];
    editable?: boolean;
    selectable?: boolean;
    createNode?: () => Promise<OrganizationTreeNodeModel | undefined>;
    deleteNode?: (nodeId: number | string) => Promise<boolean>;
    updateNode?: (node: OrganizationTreeNodeModel) => Promise<boolean>;
    moveNode?: (node: OrganizationTreeNodeModel) => Promise<boolean>;
    onSelect?: (id: number) => void;
}

function OrganizationTree({ tree, editable, selectable, createNode, deleteNode, updateNode, moveNode, onSelect }: OrganizationStructureTreeProps) {
    const { t } = useTranslation();
    const [treeData, setTreeData] = useState<OrganizationTreeNodeModel[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [selectedNode, setSelectedNode] = useState<OrganizationTreeNodeModel | null>(null);
    const [newlyCreatedNodeId, setNewlyCreatedNodeId] = useState<string | number | null>(null);
    const isEditable = editable ?? false;
    const isSelectable = selectable ?? false;

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
            setNewlyCreatedNodeId(node.id);
        }
    };

    const onDeleteNode = async (id: OrganizationTreeNodeModel['id']) => {
        await deleteNode?.(id);
    };
    const onSelectNode = (node: OrganizationTreeNodeModel) => {
        setSelectedNode(node);
        onSelect?.(node.id as number);
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
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
                {/* Tree content */}
                <div className="space-y-3">
                    {treeData.length ? (
                        <Tree
                            tree={treeData}
                            rootId={0}
                            sort={false}
                            dropTargetOffset={10}
                            initialOpen={true}
                            canDrag={(node) => isEditable && !node?.data?.isRoot}
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
                                    autoEdit={node.id === newlyCreatedNodeId}
                                    onEdit={onEditNode}
                                    onDelete={onDeleteNode}
                                    onSelect={onSelectNode}
                                    onEditComplete={() => setNewlyCreatedNodeId(null)}
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
                </div>

                {/* Add new node button */}
                {isEditable && (
                    <div className="text-center pt-6">
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
