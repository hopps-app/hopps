import { Tree, getBackendOptions, MultiBackend } from '@minoru/react-dnd-treeview';
import { useEffect, useState } from 'react';
import { DndProvider } from 'react-dnd';
import { useTranslation } from 'react-i18next';

import OrganizationTreeDropPreview from '@/components/OrganizationStructureTree/OrganizationTreeDropPreview.tsx';
import OrganizationTreeNode from '@/components/OrganizationStructureTree/OrganizationTreeNode.tsx';
import { OrganizationTreeNodeModel } from '@/components/OrganizationStructureTree/OrganizationTreeNodeModel.ts';
import OrganizationTreePlaceholder from '@/components/OrganizationStructureTree/OrganizationTreePlaceholder.tsx';
import RootBommelHeader from '@/components/OrganizationStructureTree/RootBommelHeader.tsx';
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

    // Separate root bommel from children for distinct rendering
    const rootNode = treeData.find((n) => n.data?.isRoot);
    const childNodes = treeData.filter((n) => !n.data?.isRoot);

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
            // Preserve root node since it's rendered separately from the Tree component
            const root = treeData.find((n) => n.data?.isRoot);
            setTreeData(root ? [root, ...newTree] : newTree);
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

    const handleRootClick = () => {
        if (isSelectable && rootNode) {
            setSelectedNode(rootNode);
            onSelect?.(rootNode.id as number);
        }
    };

    return (
        <DndProvider backend={MultiBackend} options={getBackendOptions()}>
            <div className="rounded-lg border border-gray-200 overflow-hidden">
                {/* Root Bommel - always pinned at the top */}
                {rootNode && (
                    <RootBommelHeader
                        node={rootNode}
                        isSelected={rootNode.id === selectedNode?.id}
                        isEditable={isEditable}
                        onClick={handleRootClick}
                    />
                )}

                {/* Children - scrollable */}
                <div className="bg-gray-50 p-6 max-h-[600px] overflow-y-auto">
                    <div className="space-y-3">
                        {childNodes.length ? (
                            <Tree
                                tree={childNodes}
                                rootId={0}
                                sort={false}
                                dropTargetOffset={10}
                                initialOpen={true}
                                canDrag={() => isEditable}
                                canDrop={(_, { dragSource, dropTargetId }) => {
                                    if (!isEditable) return false;
                                    if (dragSource?.id === dropTargetId) return false;
                                    if (dragSource) {
                                        const isDescendant = (parentId: number | string, childId: number | string): boolean => {
                                            const children = childNodes.filter((n) => n.parent === parentId);
                                            for (const child of children) {
                                                if (child.id === childId) return true;
                                                if (isDescendant(child.id, childId)) return true;
                                            }
                                            return false;
                                        };
                                        if (isDescendant(dragSource.id, dropTargetId as number | string)) return false;
                                    }
                                    return true;
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
            </div>
        </DndProvider>
    );
}

export default OrganizationTree;
