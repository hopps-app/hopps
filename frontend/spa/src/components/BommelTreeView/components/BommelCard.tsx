import { ChevronDown, GripVertical, Plus, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { usePrefetchDeleteImpact } from '../hooks/useDeleteImpact';
import { BommelCardProps } from '../types';

import { BommelCardEditForm } from './BommelCardEditForm';
import { BommelCardStats } from './BommelCardStats';
import { DeleteBommelDialog } from './DeleteBommelDialog';

import Emoji from '@/components/ui/Emoji';
import { cn } from '@/lib/utils';

const stopPropagation = (e: React.SyntheticEvent) => e.stopPropagation();

function countDescendants(node: BommelCardProps['node']): number {
    return (node.children ?? []).reduce((sum, child) => sum + 1 + countDescendants(child), 0);
}

function cardShadow({ selected, isDraggedOver, isValidDropTarget }: Pick<BommelCardProps, 'selected' | 'isDraggedOver' | 'isValidDropTarget'>) {
    if (isDraggedOver && isValidDropTarget) return 'shadow-[0_0_0_3px_var(--positive),var(--shadow-md)]';
    if (isDraggedOver && isValidDropTarget === false) return 'shadow-[0_0_0_3px_var(--negative),var(--shadow-md)]';
    if (selected) return 'shadow-[var(--shadow-selected)]';
    return 'shadow-[var(--shadow-md)]';
}

export function BommelCard({
    node,
    depth,
    expanded,
    fullWidth,
    onToggle,
    selected,
    onNodeClick,
    onEdit,
    onDelete,
    onAddChild,
    editable,
    autoEdit,
    dragDropEnabled,
    isBeingDragged,
    isDraggedOver,
    isValidDropTarget,
    onDragStart,
}: BommelCardProps) {
    const { t } = useTranslation();
    const nodeId = node.attributes?.id as number;
    const emoji = node.attributes?.emoji || '';
    const total = node.attributes?.total || 0;
    const income = node.attributes?.income || 0;
    const expenses = node.attributes?.expenses || 0;
    const hasChildren = !!node.children?.length;
    const isRoot = depth === 0;
    const parentId = node.attributes?.parentId as number;

    const [isEditing, setIsEditing] = useState(false);
    const [editedName, setEditedName] = useState(node.name);
    const [editedEmoji, setEditedEmoji] = useState(emoji);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    // Auto-enter edit mode for newly created bommels
    useEffect(() => {
        if (autoEdit && editable && !isRoot && !isEditing) {
            setEditedName(node.name);
            setEditedEmoji(emoji);
            setIsEditing(true);
        }
    }, [autoEdit]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleClick = () => {
        if (!isEditing && onNodeClick && node.attributes) {
            onNodeClick({ name: node.name, attributes: node.attributes });
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
        }
    };

    const handlePointerDown = (e: React.PointerEvent) => {
        if (!dragDropEnabled || isRoot || isEditing || !onDragStart) return;
        // A finger on the card body scrolls the page; touch drags start from the grip handle only
        if (e.pointerType === 'touch' && !(e.target as Element).closest('[data-drag-handle]')) return;
        e.stopPropagation();
        onDragStart(nodeId, node.name, emoji, parentId, e.clientX, e.clientY);
    };

    const handleStartEdit = () => {
        if (editable) {
            setEditedName(node.name);
            setEditedEmoji(emoji);
            setIsEditing(true);
        }
    };

    const handleSaveName = async () => {
        if (!editedName.trim() || editedName.trim().length > 255) {
            return;
        }
        if (onEdit) {
            const hasChanged = editedName !== node.name || editedEmoji !== emoji;
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
            setEditedName(node.name);
            setEditedEmoji(emoji);
        }
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setEditedName(node.name);
        setEditedEmoji(emoji);
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

    const [deleting, setDeleting] = useState(false);
    const prefetchDeleteImpact = usePrefetchDeleteImpact();

    // Open the dialog once its counts are loaded (the hover usually started that already), so it opens with its full
    // text instead of filling in afterwards. A slow request does not hold it back for more than half a second.
    const openDeleteDialog = async () => {
        await Promise.race([prefetchDeleteImpact(node), new Promise((resolve) => setTimeout(resolve, 500))]);
        setShowDeleteDialog(true);
    };

    const handleDeleteConfirm = async () => {
        if (!onDelete || deleting) return;
        setDeleting(true);
        try {
            if (await onDelete(nodeId)) setShowDeleteDialog(false);
        } finally {
            setDeleting(false);
        }
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

    const showEditControls = editable && !dragDropEnabled && !isEditing;
    // An empty root shows the dashed "Bommel hinzufügen" card below it instead, so there is one obvious place to start
    const showAddChild = !(isRoot && !hasChildren);
    const nameEditable = editable && !dragDropEnabled;

    return (
        <div
            data-bommel-id={nodeId}
            role="button"
            tabIndex={0}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            onPointerDown={handlePointerDown}
            className={cn(
                'relative text-left rounded-2xl border transition-[box-shadow,border-color,opacity] duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                fullWidth ? 'w-full' : isRoot ? 'w-[300px]' : depth === 1 ? 'w-[240px]' : 'w-[210px]',
                depth >= 2 ? 'px-[13px] py-[11px]' : 'px-[15px] py-[13px]',
                isRoot ? 'bg-purple-500 border-purple-500 text-white' : 'bg-background-secondary text-foreground',
                !isRoot && (selected ? 'border-primary' : 'border-border-soft'),
                isBeingDragged && 'opacity-40 border-2 border-dashed border-purple-400',
                dragDropEnabled && !isRoot ? 'cursor-grab select-none [-webkit-touch-callout:none]' : 'cursor-pointer',
                cardShadow({ selected, isDraggedOver, isValidDropTarget })
            )}
        >
            <div className="flex items-center gap-2.5 min-w-0">
                {dragDropEnabled && !isRoot && (
                    <span
                        data-drag-handle
                        className="-ml-1.5 flex-shrink-0 grid place-items-center w-6 h-[30px] rounded-md text-muted-foreground touch-none"
                        aria-hidden="true"
                    >
                        <GripVertical className="w-4 h-4" />
                    </span>
                )}
                {isEditing ? (
                    <BommelCardEditForm
                        name={editedName}
                        emoji={editedEmoji}
                        onNameChange={setEditedName}
                        onEmojiChange={setEditedEmoji}
                        onSave={handleSaveName}
                    />
                ) : (
                    <div
                        className={cn('flex items-center gap-2.5 min-w-0 flex-1', nameEditable && 'cursor-text hover:opacity-80')}
                        onClick={(e) => {
                            if (nameEditable) {
                                e.stopPropagation();
                                handleStartEdit();
                            }
                        }}
                    >
                        {emoji && (
                            <span className={cn('flex-shrink-0 leading-none text-center', isRoot ? 'text-[26px] w-[30px]' : 'text-[22px] w-[26px]')}>
                                <Emoji emoji={emoji} />
                            </span>
                        )}
                        <div className="min-w-0 flex-1">
                            <div className={cn('font-extrabold tracking-[-0.01em] truncate', isRoot ? 'text-[17px]' : 'text-[16px]')}>{node.name}</div>
                            {isRoot && (
                                <div className="text-[11.5px] font-semibold opacity-80">{t('bommel.subBommelCount', { count: countDescendants(node) })}</div>
                            )}
                        </div>
                    </div>
                )}

                {hasChildren && !isEditing && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggle();
                        }}
                        className={cn(
                            'w-[26px] h-[26px] flex-shrink-0 rounded-full grid place-items-center text-inherit',
                            'transition-transform duration-200 ease-[var(--ease-out)]',
                            isRoot ? 'bg-white/20' : 'bg-[var(--surface-sunken)] border border-border-soft',
                            !expanded && '-rotate-90'
                        )}
                        title={expanded ? t('bommel.collapse') : t('bommel.expand')}
                        aria-label={expanded ? t('bommel.collapse') : t('bommel.expand')}
                        aria-expanded={expanded}
                    >
                        <ChevronDown className="w-[15px] h-[15px]" aria-hidden="true" />
                    </button>
                )}
            </div>

            <BommelCardStats total={total} income={income} expenses={expenses} isRoot={isRoot} />

            {showEditControls && (
                <div onClick={(e) => e.stopPropagation()}>
                    {showAddChild && (
                        <button
                            type="button"
                            onClick={handleAddChild}
                            className={cn(
                                'absolute -bottom-[13px] z-10 w-[26px] h-[26px] rounded-full grid place-items-center bg-background-secondary border-[1.5px] border-[var(--positive)] text-[var(--positive)] shadow-[var(--shadow-sm)]',
                                // Vertical layout: sit on the rail where the new child will hang (20px in, see BommelBranch)
                                fullWidth ? 'left-[7px]' : 'left-1/2 -translate-x-1/2'
                            )}
                            title={t('bommel.addChild')}
                            aria-label={t('bommel.addChild')}
                        >
                            <Plus className="w-3.5 h-3.5" strokeWidth={2.4} aria-hidden="true" />
                        </button>
                    )}
                    {!isRoot && (
                        <button
                            type="button"
                            onClick={openDeleteDialog}
                            onPointerEnter={() => prefetchDeleteImpact(node)}
                            onFocus={() => prefetchDeleteImpact(node)}
                            className="absolute -top-[11px] -right-[11px] z-10 w-[26px] h-[26px] rounded-full grid place-items-center bg-background-secondary border-[1.5px] border-[var(--negative)] text-[var(--negative)] shadow-[var(--shadow-sm)]"
                            title={t('bommel.deleteBommel')}
                            aria-label={t('bommel.deleteBommel')}
                        >
                            <Trash2 className="w-[13px] h-[13px]" aria-hidden="true" />
                        </button>
                    )}
                </div>
            )}

            {/* The dialog renders in a portal, but React still bubbles its events through this card. Stop them here:
                otherwise clicking "Löschen" would also select the card being deleted, and pointer events would reach
                the canvas' pan handlers. */}
            <div className="contents" onClick={stopPropagation} onPointerDown={stopPropagation} onPointerUp={stopPropagation} onKeyDown={stopPropagation}>
                <DeleteBommelDialog
                    open={showDeleteDialog}
                    node={node}
                    deleting={deleting}
                    onConfirm={handleDeleteConfirm}
                    onCancel={() => setShowDeleteDialog(false)}
                />
            </div>
        </div>
    );
}

export default BommelCard;
