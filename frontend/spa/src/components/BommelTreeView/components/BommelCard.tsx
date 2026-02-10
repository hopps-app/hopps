import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { RawNodeDatum } from 'react-d3-tree';
import { useTranslation } from 'react-i18next';

import { BommelCardProps, TreeNodeData } from '../types';

import { BommelCardActions } from './BommelCardActions';
import { BommelCardEditForm } from './BommelCardEditForm';
import { BommelCardStats } from './BommelCardStats';
import { DeleteBommelDialog, DeleteTransactionHandling } from './DeleteBommelDialog';

import Emoji from '@/components/ui/Emoji';

export function BommelCard({ nodeDatum, toggleNode, onNodeClick, onEdit, onDelete, onAddChild, editable }: BommelCardProps) {
    const { t } = useTranslation();
    const nodeId = nodeDatum.attributes?.id as number;
    const total = (nodeDatum.attributes?.total as number) || 0;
    const income = (nodeDatum.attributes?.income as number) || 0;
    const expenses = (nodeDatum.attributes?.expenses as number) || 0;
    const transactionsCount = (nodeDatum.attributes?.transactionsCount as number) || 0;
    const hasChildren = nodeDatum.children && nodeDatum.children.length > 0;

    const [isEditing, setIsEditing] = useState(false);
    const [editedName, setEditedName] = useState(nodeDatum.name);
    const [editedEmoji, setEditedEmoji] = useState((nodeDatum.attributes?.emoji as string) || '');
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    const isCollapsed = (nodeDatum as RawNodeDatum & { __rd3t?: { collapsed?: boolean } }).__rd3t?.collapsed;

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

    const handleDeleteClick = () => {
        setShowDeleteDialog(true);
    };

    const handleDeleteConfirm = async (transactionHandling?: DeleteTransactionHandling) => {
        if (onDelete) {
            // For now, we ignore transactionHandling since the backend API doesn't support it yet
            // In the future, this would be passed to the API
            await onDelete(nodeId);
            setShowDeleteDialog(false);
        }
    };

    const handleDeleteCancel = () => {
        setShowDeleteDialog(false);
    };

    const handleAddChild = async () => {
        if (onAddChild) {
            await onAddChild(nodeId);
        }
    };

    return (
        <div onClick={handleClick} className="w-full h-full cursor-pointer font-sans relative">
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-3 shadow-md h-full flex flex-col gap-2 transition-all bommel-card">
                {/* Collapse toggle button */}
                {hasChildren && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleNode();
                        }}
                        className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white border-2 border-purple-500 rounded-full w-6 h-6 flex items-center justify-center cursor-pointer z-10 transition-all collapse-button hover:bg-purple-50"
                        aria-label={isCollapsed ? t('organization.structure.details.subBommels') : t('organization.structure.details.subBommels')}
                        aria-expanded={!isCollapsed}
                    >
                        {isCollapsed ? (
                            <ChevronRight className="w-3 h-3 text-purple-600" aria-hidden="true" />
                        ) : (
                            <ChevronDown className="w-3 h-3 text-purple-600" aria-hidden="true" />
                        )}
                    </button>
                )}

                {/* Header with emoji and name */}
                <div className="flex items-center gap-2">
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
                        <>
                            {nodeDatum.attributes?.emoji && (
                                <div className="text-xl flex-shrink-0">
                                    <Emoji emoji={nodeDatum.attributes.emoji as string} />
                                </div>
                            )}
                            <div className="text-white text-sm font-semibold overflow-hidden text-ellipsis whitespace-nowrap flex-1">{nodeDatum.name}</div>
                        </>
                    )}

                    {/* Action buttons in edit mode */}
                    {editable && !isEditing && <BommelCardActions onEdit={() => setIsEditing(true)} onDelete={handleDeleteClick} onAddChild={handleAddChild} />}
                </div>

                {/* Financial Stats - Only show in view mode */}
                {!editable && <BommelCardStats total={total} income={income} expenses={expenses} transactionsCount={transactionsCount} />}

                {/* Edit mode info */}
                {editable && (
                    <div className="text-center text-[10px] text-white/70">
                        {hasChildren && (
                            <span>
                                {nodeDatum.children?.length || 0} {t('organization.structure.subBommelsLabel')}
                            </span>
                        )}
                    </div>
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
