import { ArrowRight, ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { RawNodeDatum } from 'react-d3-tree';
import { useTranslation } from 'react-i18next';

import { BommelCardProps, TreeNodeData } from '../types';

import { BommelCardEditForm } from './BommelCardEditForm';
import { BommelCardStats } from './BommelCardStats';
import { DeleteBommelDialog, DeleteTransactionHandling } from './DeleteBommelDialog';

import Emoji from '@/components/ui/Emoji';

export function BommelCard({
    nodeDatum,
    toggleNode,
    onNodeClick,
    onEdit,
    onDelete,
    onAddChild,
    onMove,
    editable,
    dragDropEnabled,
    isBeingDragged,
    isDraggedOver,
    isValidDropTarget,
    onDragStart,
    onDragEnter,
    onDragLeave,
}: BommelCardProps) {
    const { t } = useTranslation();
    const nodeId = nodeDatum.attributes?.id as number;
    const total = (nodeDatum.attributes?.total as number) || 0;
    const income = (nodeDatum.attributes?.income as number) || 0;
    const expenses = (nodeDatum.attributes?.expenses as number) || 0;
    const transactionsCount = (nodeDatum.attributes?.transactionsCount as number) || 0;
    const hasChildren = nodeDatum.children && nodeDatum.children.length > 0;
    const isRoot = !!nodeDatum.attributes?.isRoot;
    const isLastSibling = !!nodeDatum.attributes?.isLastSibling;
    const parentId = nodeDatum.attributes?.parentId as number;

    const [isEditing, setIsEditing] = useState(false);
    const [editedName, setEditedName] = useState(nodeDatum.name);
    const [editedEmoji, setEditedEmoji] = useState((nodeDatum.attributes?.emoji as string) || '');
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    const isCollapsed = (nodeDatum as RawNodeDatum & { __rd3t?: { collapsed?: boolean } }).__rd3t?.collapsed;
    const didDragRef = useRef(false);

    const handleClick = () => {
        if (didDragRef.current) {
            didDragRef.current = false;
            return;
        }
        if (!isEditing && onNodeClick && nodeDatum.attributes) {
            const nodeData: TreeNodeData = {
                name: nodeDatum.name,
                attributes: nodeDatum.attributes as TreeNodeData['attributes'],
            };
            onNodeClick(nodeData);
        }
    };

    const handlePointerDown = (e: React.PointerEvent) => {
        if (!dragDropEnabled || isRoot || isEditing || !onDragStart) return;
        e.stopPropagation();
        didDragRef.current = false;
        onDragStart(nodeId, nodeDatum.name, (nodeDatum.attributes?.emoji as string) || '', parentId, e.clientX, e.clientY);
    };

    const handlePointerEnter = () => {
        if (onDragEnter) onDragEnter(nodeId);
    };

    const handlePointerLeave = () => {
        if (onDragLeave) onDragLeave(nodeId);
    };

    const handleStartEdit = () => {
        if (editable && !isRoot) {
            setEditedName(nodeDatum.name);
            setEditedEmoji((nodeDatum.attributes?.emoji as string) || '');
            setIsEditing(true);
        }
    };

    const handleSaveName = async () => {
        if (!editedName.trim() || editedName.trim().length > 255) {
            return;
        }
        if (onEdit) {
            const hasChanged = editedName !== nodeDatum.name || editedEmoji !== ((nodeDatum.attributes?.emoji as string) || '');
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
            setEditedEmoji((nodeDatum.attributes?.emoji as string) || '');
        }
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setEditedName(nodeDatum.name);
        setEditedEmoji((nodeDatum.attributes?.emoji as string) || '');
    };

    // Auto-save or cancel when leaving edit mode (clicking "Fertig")
    useEffect(() => {
        if (!editable && isEditing) {
            const trimmedName = editedName.trim();
            if (trimmedName && trimmedName.length <= 255) {
                handleSaveName();
            } else {
                handleCancelEdit();
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editable]);

    const handleDeleteClick = () => {
        setShowDeleteDialog(true);
    };

    const deletingRef = useRef(false);

    const handleDeleteConfirm = async (_transactionHandling?: DeleteTransactionHandling) => {
        if (onDelete) {
            if (deletingRef.current) return;
            deletingRef.current = true;
            try {
                await onDelete(nodeId);
                setShowDeleteDialog(false);
            } finally {
                deletingRef.current = false;
            }
        }
    };

    const handleDeleteCancel = () => {
        setShowDeleteDialog(false);
    };

    const addingChildRef = useRef(false);

    const handleAddChild = async () => {
        if (onAddChild) {
            if (addingChildRef.current) return;
            addingChildRef.current = true;
            try {
                await onAddChild(nodeId);
            } finally {
                addingChildRef.current = false;
            }
        }
    };

    const addingSiblingRef = useRef(false);

    const handleAddSibling = async () => {
        if (onAddChild && parentId !== undefined) {
            if (addingSiblingRef.current) return;
            addingSiblingRef.current = true;
            try {
                await onAddChild(parentId);
            } finally {
                addingSiblingRef.current = false;
            }
        }
    };

    // Build card CSS classes for drag states
    const dragClasses = [
        isBeingDragged ? 'is-being-dragged' : '',
        isDraggedOver && isValidDropTarget ? 'is-valid-drop-target' : '',
        isDraggedOver && isValidDropTarget === false ? 'is-invalid-drop-target' : '',
    ]
        .filter(Boolean)
        .join(' ');

    const cursorClass = dragDropEnabled && !isRoot ? 'cursor-grab' : 'cursor-pointer';

    return (
        <div
            onClick={handleClick}
            onPointerDown={handlePointerDown}
            onPointerEnter={handlePointerEnter}
            onPointerLeave={handlePointerLeave}
            className={`w-full font-sans ${cursorClass}`}
            style={dragDropEnabled ? { touchAction: 'none' } : undefined}
        >
            {/* Card */}
            <div
                className={`relative rounded-xl px-3 py-2 shadow-md transition-all bommel-card ${dragClasses} ${isRoot ? 'bg-gradient-to-br from-purple-500 to-purple-600' : 'bg-white border border-purple-200'}`}
            >
                {/* Collapse toggle button */}
                {hasChildren && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleNode();
                        }}
                        className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white border-2 border-purple-500 rounded-full w-6 h-6 flex items-center justify-center cursor-pointer z-10 transition-all collapse-button hover:bg-purple-50"
                        aria-label={t('organization.structure.details.subBommels')}
                        aria-expanded={!isCollapsed}
                    >
                        {isCollapsed ? (
                            <ChevronRight className="w-3 h-3 text-purple-600" aria-hidden="true" />
                        ) : (
                            <ChevronDown className="w-3 h-3 text-purple-600" aria-hidden="true" />
                        )}
                    </button>
                )}

                {/* Delete button - top right corner (hidden in drag-drop mode) */}
                {editable && !dragDropEnabled && !isEditing && !isRoot && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick();
                        }}
                        className="absolute -top-1.5 -right-1.5 bg-red-500/80 text-white border-none rounded-full w-5 h-5 flex items-center justify-center cursor-pointer hover:bg-red-600 transition-colors z-10"
                        title={t('organization.structure.deleteBommel')}
                        aria-label={t('organization.structure.deleteBommel')}
                    >
                        <Trash2 className="w-2.5 h-2.5" aria-hidden="true" />
                    </button>
                )}

                {/* Move button - bottom right corner (hidden in drag-drop mode) */}
                {editable && !dragDropEnabled && !isEditing && !isRoot && onMove && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onMove(nodeId);
                        }}
                        className="absolute -bottom-1.5 -right-1.5 bg-blue-500/80 text-white border-none rounded-full w-5 h-5 flex items-center justify-center cursor-pointer hover:bg-blue-600 transition-colors z-10"
                        title={t('organization.structure.moveBommel')}
                        aria-label={t('organization.structure.moveBommel')}
                    >
                        <ArrowRight className="w-2.5 h-2.5" aria-hidden="true" />
                    </button>
                )}

                {/* Content: emoji + name or edit form */}
                <div className="flex items-center gap-2 min-w-0">
                    {isEditing ? (
                        <BommelCardEditForm
                            name={editedName}
                            emoji={editedEmoji}
                            onNameChange={setEditedName}
                            onEmojiChange={setEditedEmoji}
                            onSave={handleSaveName}
                            onCancel={handleCancelEdit}
                        />
                    ) : (
                        <div
                            className={`flex items-center gap-2 min-w-0 flex-1 ${editable && !dragDropEnabled && !isRoot ? 'cursor-text hover:opacity-80' : ''}`}
                            onClick={(e) => {
                                if (editable && !dragDropEnabled && !isRoot) {
                                    e.stopPropagation();
                                    handleStartEdit();
                                }
                            }}
                        >
                            {nodeDatum.attributes?.emoji && (
                                <div className="text-xl flex-shrink-0">
                                    <Emoji emoji={nodeDatum.attributes.emoji as string} />
                                </div>
                            )}
                            <div
                                className={`text-sm font-semibold overflow-hidden text-ellipsis whitespace-nowrap flex-1 min-w-0 ${isRoot ? 'text-white' : 'text-gray-800'}`}
                            >
                                {nodeDatum.name}
                            </div>
                        </div>
                    )}
                </div>

                {/* Financial Stats - Only show in view mode */}
                {!editable && <BommelCardStats total={total} income={income} expenses={expenses} transactionsCount={transactionsCount} isRoot={isRoot} />}

                {/* Add child button - bottom center, only when no children */}
                {editable && !dragDropEnabled && !hasChildren && !isEditing && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleAddChild();
                        }}
                        className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-green-500 text-white rounded-full w-5 h-5 flex items-center justify-center cursor-pointer hover:bg-green-600 shadow-md z-20 transition-colors"
                        title={t('organization.structure.addChild')}
                        aria-label={t('organization.structure.addChild')}
                    >
                        <Plus className="w-3 h-3" aria-hidden="true" />
                    </button>
                )}

                {/* Sibling add button - right side, only on last child of each parent */}
                {isLastSibling && editable && !dragDropEnabled && !isEditing && !isRoot && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleAddSibling();
                        }}
                        className="absolute -right-5 top-1/2 -translate-y-1/2 bg-green-500 text-white rounded-full w-5 h-5 flex items-center justify-center cursor-pointer hover:bg-green-600 shadow-md z-20 transition-colors"
                        title={t('organization.structure.addSibling')}
                        aria-label={t('organization.structure.addSibling')}
                    >
                        <Plus className="w-3 h-3" aria-hidden="true" />
                    </button>
                )}
            </div>

            {/* Delete confirmation dialog */}
            <DeleteBommelDialog
                open={showDeleteDialog}
                bommelName={nodeDatum.name}
                hasTransactions={transactionsCount > 0}
                hasChildren={!!hasChildren}
                childrenCount={nodeDatum.children?.length || 0}
                onConfirm={handleDeleteConfirm}
                onCancel={handleDeleteCancel}
            />
        </div>
    );
}

export default BommelCard;
