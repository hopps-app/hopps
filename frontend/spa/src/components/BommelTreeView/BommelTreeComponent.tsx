import { useMemo, useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import Tree, { RawNodeDatum, CustomNodeElementProps } from 'react-d3-tree';
import { Bommel } from '@hopps/api-client';
import { ChevronDown, ChevronRight, Pencil, Trash2, Check, X, Plus } from 'lucide-react';

import Emoji from '@/components/ui/Emoji';
import EmojiField from '@/components/ui/EmojiField';
import { OrganizationTreeNodeModel } from '@/components/OrganizationStructureTree/OrganizationTreeNodeModel';

// Interface for react-d3-tree data structure that extends RawNodeDatum
interface TreeNodeData extends RawNodeDatum {
    name: string;
    attributes?: {
        id: number;
        emoji?: string;
        nodeId?: number;
        income?: number;
        expenses?: number;
        revenue?: number;
        receiptsCount?: number;
        receiptsOpen?: number;
    };
    children?: TreeNodeData[];
}

interface BommelTreeComponentProps {
    tree: OrganizationTreeNodeModel[];
    rootBommel?: Bommel | null;
    editable?: boolean;
    onNodeClick?: (nodeData: TreeNodeData) => void;
    onEdit?: (nodeId: number, newName: string, newEmoji?: string) => Promise<boolean>;
    onDelete?: (nodeId: number) => Promise<boolean>;
    onAddChild?: (nodeId: number) => Promise<boolean>;
    width?: number;
    height?: number;
}

// Separate component for card
function BommelCard({
    nodeDatum,
    toggleNode,
    onNodeClick,
    onEdit,
    onDelete,
    onAddChild,
    editable,
}: {
    nodeDatum: RawNodeDatum;
    toggleNode: () => void;
    onNodeClick?: (nodeData: TreeNodeData) => void;
    onEdit?: (nodeId: number, newName: string, newEmoji?: string) => Promise<boolean>;
    onDelete?: (nodeId: number) => Promise<boolean>;
    onAddChild?: (nodeId: number) => Promise<boolean>;
    editable: boolean;
}) {
    const { t } = useTranslation();
    const nodeId = nodeDatum.attributes?.id as number;
    const income = nodeDatum.attributes?.income || 0;
    const expenses = nodeDatum.attributes?.expenses || 0;
    const revenue = nodeDatum.attributes?.revenue || 0;
    const receiptsCount = nodeDatum.attributes?.receiptsCount || 0;
    const receiptsOpen = nodeDatum.attributes?.receiptsOpen || 0;
    const hasChildren = nodeDatum.children && nodeDatum.children.length > 0;

    const [isEditing, setIsEditing] = useState(false);
    const [editedName, setEditedName] = useState(nodeDatum.name);
    const [editedEmoji, setEditedEmoji] = useState(nodeDatum.attributes?.emoji || '');

    const handleClick = () => {
        if (!isEditing && onNodeClick && nodeDatum.attributes) {
            const nodeData: TreeNodeData = {
                name: nodeDatum.name,
                attributes: nodeDatum.attributes as TreeNodeData['attributes'],
            };
            onNodeClick(nodeData);
        }
    };

    const handleSaveName = async () => {
        if (onEdit && editedName.trim()) {
            const hasChanged = editedName !== nodeDatum.name || editedEmoji !== (nodeDatum.attributes?.emoji || '');
            if (hasChanged) {
                const success = await onEdit(nodeId, editedName.trim(), editedEmoji);
                if (success) {
                    setIsEditing(false);
                }
            } else {
                setIsEditing(false);
            }
        } else {
            setIsEditing(false);
            setEditedName(nodeDatum.name);
            setEditedEmoji(nodeDatum.attributes?.emoji || '');
        }
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setEditedName(nodeDatum.name);
        setEditedEmoji(nodeDatum.attributes?.emoji || '');
    };

    const handleDelete = async () => {
        if (onDelete && window.confirm(t('organization.structure.deleteDialog.title'))) {
            await onDelete(nodeId);
        }
    };

    const handleAddChild = async () => {
        if (onAddChild) {
            await onAddChild(nodeId);
        }
    };

    const isCollapsed = (nodeDatum as RawNodeDatum & { __rd3t?: { collapsed?: boolean } }).__rd3t?.collapsed;

    return (
        <div
            onClick={handleClick}
            style={{
                width: '100%',
                height: '100%',
                cursor: 'pointer',
                fontFamily: 'system-ui, sans-serif',
                position: 'relative',
            }}
        >
            <div
                style={{
                    background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                    borderRadius: '12px',
                    padding: '12px',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    transition: 'all 0.2s ease',
                }}
                className="bommel-card"
            >
                {/* Collapse toggle button */}
                {hasChildren && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleNode();
                        }}
                        style={{
                            position: 'absolute',
                            top: '-12px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            background: 'white',
                            border: '2px solid #8b5cf6',
                            borderRadius: '50%',
                            width: '24px',
                            height: '24px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            zIndex: 10,
                            transition: 'all 0.2s ease',
                        }}
                        className="collapse-button"
                    >
                        {isCollapsed ? <ChevronRight className="w-3 h-3 text-purple-600" /> : <ChevronDown className="w-3 h-3 text-purple-600" />}
                    </button>
                )}

                {/* Header with emoji and name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {isEditing ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1 }} onClick={(e) => e.stopPropagation()}>
                            <div style={{ width: '40px', flexShrink: 0 }}>
                                <EmojiField value={editedEmoji} onChange={setEditedEmoji} className="py-0 px-1 h-8 text-sm" />
                            </div>
                            <input
                                type="text"
                                value={editedName}
                                onChange={(e) => setEditedName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        handleSaveName();
                                    } else if (e.key === 'Escape') {
                                        handleCancelEdit();
                                    }
                                }}
                                autoFocus
                                style={{
                                    flex: 1,
                                    background: 'white',
                                    color: '#374151',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    border: '2px solid #8b5cf6',
                                    outline: 'none',
                                }}
                            />
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleSaveName();
                                }}
                                style={{
                                    background: '#10b981',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    padding: '4px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                }}
                                title={t('organization.structure.saveName')}
                            >
                                <Check className="w-4 h-4" />
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleCancelEdit();
                                }}
                                style={{
                                    background: '#ef4444',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    padding: '4px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                }}
                                title={t('organization.structure.cancelEdit')}
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    ) : (
                        <>
                            {nodeDatum.attributes?.emoji && (
                                <div style={{ fontSize: '20px', flexShrink: 0 }}>
                                    <Emoji emoji={nodeDatum.attributes.emoji as string} />
                                </div>
                            )}
                            <div
                                style={{
                                    color: 'white',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    flex: 1,
                                }}
                            >
                                {nodeDatum.name}
                            </div>
                        </>
                    )}

                    {/* Edit, Add Child and Delete buttons in edit mode */}
                    {editable && !isEditing && (
                        <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleAddChild();
                                }}
                                style={{
                                    background: 'rgba(34, 197, 94, 0.8)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    padding: '4px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                }}
                                title={t('organization.structure.addChild')}
                            >
                                <Plus className="w-3 h-3" />
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsEditing(true);
                                }}
                                style={{
                                    background: 'rgba(255, 255, 255, 0.2)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    padding: '4px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                }}
                                title={t('organization.structure.editName')}
                            >
                                <Pencil className="w-3 h-3" />
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete();
                                }}
                                style={{
                                    background: 'rgba(239, 68, 68, 0.8)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    padding: '4px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                }}
                                title={t('organization.structure.deleteBommel')}
                            >
                                <Trash2 className="w-3 h-3" />
                            </button>
                        </div>
                    )}
                </div>

                {/* Financial Stats - Only show in view mode */}
                {!editable && (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                            <div style={{ flex: 1, textAlign: 'center' }}>
                                <div style={{ fontSize: '9px', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '2px' }}>
                                    {t('organization.structure.details.income')}
                                </div>
                                <div style={{ fontSize: '11px', color: '#86efac', fontWeight: '600' }}>+{(income / 1000).toFixed(1)}k€</div>
                            </div>

                            <div style={{ flex: 1, textAlign: 'center' }}>
                                <div style={{ fontSize: '9px', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '2px' }}>
                                    {t('organization.structure.details.expenses')}
                                </div>
                                <div style={{ fontSize: '11px', color: '#fca5a5', fontWeight: '600' }}>{(expenses / 1000).toFixed(1)}k€</div>
                            </div>

                            <div style={{ flex: 1, textAlign: 'center', background: 'rgba(255, 255, 255, 0.15)', borderRadius: '6px', padding: '4px' }}>
                                <div style={{ fontSize: '9px', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '2px' }}>
                                    {t('organization.structure.details.revenue')}
                                </div>
                                <div style={{ fontSize: '12px', color: revenue >= 0 ? '#86efac' : '#fca5a5', fontWeight: '700' }}>
                                    {revenue >= 0 ? '+' : ''}
                                    {(revenue / 1000).toFixed(1)}k€
                                </div>
                            </div>
                        </div>

                        {/* Receipt stats */}
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', fontSize: '10px', color: 'rgba(255, 255, 255, 0.8)' }}>
                            <span>
                                {receiptsCount} {t('organization.structure.receiptsLabel')}
                            </span>
                            {receiptsOpen > 0 && (
                                <span style={{ background: '#f97316', color: 'white', padding: '2px 6px', borderRadius: '9999px', fontSize: '9px' }}>
                                    {receiptsOpen} {t('organization.structure.openLabel')}
                                </span>
                            )}
                        </div>
                    </>
                )}

                {/* Edit mode info */}
                {editable && (
                    <div style={{ textAlign: 'center', fontSize: '10px', color: 'rgba(255, 255, 255, 0.7)' }}>
                        {hasChildren && (
                            <span>
                                {nodeDatum.children?.length || 0} {t('organization.structure.subBommelsLabel')}
                            </span>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

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
    const treeData = useMemo(() => {
        if (!tree.length && !rootBommel) {
            return null;
        }

        const buildTreeNode = (nodes: OrganizationTreeNodeModel[], parentId: string | number = 0): TreeNodeData[] => {
            const filteredNodes = nodes.filter((node) => node.parent === parentId);

            return filteredNodes.map((node) => {
                const children = buildTreeNode(nodes, node.id);
                return {
                    name: node.text || 'Unnamed',
                    attributes: {
                        id: node.id as number,
                        emoji: node.data?.emoji || '',
                        nodeId: node.id as number,
                        income: node.data?.income || 0,
                        expenses: node.data?.expenses || 0,
                        revenue: node.data?.revenue || 0,
                        receiptsCount: node.data?.receiptsCount || 0,
                        receiptsOpen: node.data?.receiptsOpen || 0,
                    },
                    children: children.length > 0 ? children : undefined,
                };
            });
        };

        const topLevelNodes = buildTreeNode(tree, 0);

        if (topLevelNodes.length === 0 && rootBommel) {
            return {
                name: rootBommel.name || 'Organization',
                attributes: {
                    id: rootBommel.id || 0,
                    emoji: 'building',
                    nodeId: rootBommel.id || 0,
                    income: 0,
                    expenses: 0,
                    revenue: 0,
                    receiptsCount: 0,
                    receiptsOpen: 0,
                },
            };
        }

        if (topLevelNodes.length > 1) {
            return {
                name: rootBommel?.name || 'Organization',
                attributes: {
                    id: rootBommel?.id || 0,
                    emoji: 'building',
                    nodeId: rootBommel?.id || 0,
                    income: 0,
                    expenses: 0,
                    revenue: 0,
                    receiptsCount: 0,
                    receiptsOpen: 0,
                },
                children: topLevelNodes,
            };
        }

        return topLevelNodes[0] || null;
    }, [tree, rootBommel]);

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
        return (
            <div className="flex items-center justify-center h-64 text-gray-500">
                <div className="text-center">
                    <div className="text-lg font-medium">{t('organization.structure.noData')}</div>
                    <div className="text-sm">{t('organization.structure.addItems')}</div>
                </div>
            </div>
        );
    }

    const TreeContent = (
        <div ref={treeContainerRef} className="w-full border rounded-lg bg-gradient-to-br from-gray-50 to-gray-100 relative" style={{ height: height }}>
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

            <style>{`
                .tree-link {
                    stroke: #a78bfa;
                    stroke-width: 2.5;
                    fill: none;
                    transition: stroke 0.2s ease;
                }
                .tree-link:hover {
                    stroke: #7c3aed;
                    stroke-width: 3.5;
                }
                .rd3t-node circle {
                    display: none;
                }
                .rd3t-node text {
                    display: none;
                }
                .rd3t-tree-container {
                    width: 100% !important;
                    height: 100% !important;
                }
                .bommel-card:hover {
                    transform: scale(1.05);
                    box-shadow: 0 8px 12px rgba(0, 0, 0, 0.15) !important;
                    border-radius: 12px !important;
                }
                .collapse-button:hover {
                    background: #f3e8ff !important;
                    transform: translateX(-50%) scale(1.1);
                }
            `}</style>
        </div>
    );

    return TreeContent;
}

export default BommelTreeComponent;
