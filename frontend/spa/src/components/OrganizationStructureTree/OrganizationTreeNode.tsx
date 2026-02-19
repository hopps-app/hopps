import { NodeModel, useDragOver } from '@minoru/react-dnd-treeview';
import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { validateBommelName } from '@/components/BommelTreeView/components/BommelCardEditForm';
import { OrganizationTreeNodeModel } from '@/components/OrganizationStructureTree/OrganizationTreeNodeModel.ts';
import Button from '@/components/ui/Button.tsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog.tsx';
import Emoji from '@/components/ui/Emoji.tsx';
import EmojiField from '@/components/ui/EmojiField.tsx';
import Icon from '@/components/ui/Icon.tsx';
import TextField from '@/components/ui/TextField.tsx';
import { cn } from '@/lib/utils.ts';

type Props = {
    node: OrganizationTreeNodeModel;
    depth: number;
    isOpen: boolean;
    isSelected: boolean;
    hasChild: boolean;
    disableHover: boolean;
    editable: boolean;
    selectable: boolean;
    autoEdit?: boolean;
    onToggle: (id: NodeModel['id']) => void;
    onEdit: (node: OrganizationTreeNodeModel) => void;
    onDelete: (id: NodeModel['id']) => void;
    onSelect: (node: OrganizationTreeNodeModel) => void;
    onEditComplete?: () => void;
};

const IDENT_SIZE = 32;

function OrganizationTreeNode(props: Props) {
    const { t } = useTranslation();
    const { id, data } = props.node;
    const indent = props.depth * IDENT_SIZE;
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState('');
    const [editEmoji, setEditEmoji] = useState('');
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [validationError, setValidationError] = useState<string | null>(null);
    const textFieldRef = useRef<HTMLInputElement>(null);

    const emoji = data?.emoji || '';
    const isRoot = data?.isRoot ?? false;

    const handleToggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        props.onToggle(props.node.id);
    };

    const handleSelect = () => props.selectable && props.onSelect(props.node);

    const onEditValueChange = (value: string) => {
        setEditValue(value);
        // Clear validation error when user starts typing valid input
        if (validationError) {
            const error = validateBommelName(value);
            if (!error) {
                setValidationError(null);
            }
        }
    };

    const onEmojiChanged = (value: string) => {
        setEditEmoji(value);
    };

    const onClickEdit = () => {
        if (!props.editable || isRoot) return;
        setEditValue(props.node.text);
        setEditEmoji(emoji);
        setIsEditing(true);
    };

    const onClickDelete = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (isRoot) return;

        // Check if bommel has transactions
        if (transactionsCount && transactionsCount > 0) {
            setIsDeleteDialogOpen(true);
        } else {
            handleConfirmDelete();
        }
    };

    const handleConfirmDelete = () => {
        setIsDeleteDialogOpen(false);
        props.onDelete(id);
    };

    const handleCancelDelete = () => {
        setIsDeleteDialogOpen(false);
    };

    const onClickAcceptEdit = () => {
        const error = validateBommelName(editValue);
        if (error === 'required') {
            setValidationError(t('organization.structure.validation.nameRequired'));
            return;
        }
        if (error === 'maxLength') {
            setValidationError(t('organization.structure.validation.nameMaxLength'));
            return;
        }
        setValidationError(null);
        props.onEdit({ ...props.node, text: editValue.trim(), data: { ...props.node.data, emoji: editEmoji } });
        setIsEditing(false);
        props.onEditComplete?.();
    };

    const onClickCancelEdit = () => {
        setIsEditing(false);
        setEditValue('');
        setValidationError(null);
        props.onEditComplete?.();
    };

    const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            onClickAcceptEdit();
        } else if (event.key === 'Escape') {
            onClickCancelEdit();
        }
    };

    useEffect(() => {
        if (isEditing && textFieldRef.current) {
            textFieldRef.current.focus();
        }
    }, [isEditing]);

    // Auto-edit mode for newly created nodes
    useEffect(() => {
        if (props.autoEdit && props.editable && !isEditing) {
            setEditValue(props.node.text);
            setEditEmoji(emoji);
            setIsEditing(true);
        }
    }, [props.autoEdit, props.editable, isEditing, props.node.text, emoji]);

    const dragOverProps = useDragOver(id, props.isOpen, props.onToggle);

    const { total, income, expenses, transactionsCount, subBommelsCount } = props.node.data || {};

    const formatCurrency = (value?: number) => {
        if (value === undefined || value === null) return '-';
        const sign = value >= 0 ? '+' : '';
        return `${sign}${value.toLocaleString('de-DE')}€`;
    };

    return (
        <>
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent onClick={(e) => e.stopPropagation()}>
                    <DialogHeader>
                        <DialogTitle>{t('organization.structure.deleteDialog.title')}</DialogTitle>
                        <DialogDescription>{t('organization.structure.deleteDialog.description', { count: transactionsCount })}</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={handleCancelDelete}>
                            {t('organization.structure.deleteDialog.cancel')}
                        </Button>
                        <Button variant="destructive" onClick={handleConfirmDelete}>
                            {t('organization.structure.deleteDialog.confirm')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <div className="py-3 select-none group" style={{ paddingInlineStart: indent }} {...dragOverProps}>
                <div className="flex items-center gap-3">
                    {/* Expand/Collapse Button */}
                    <button
                        onClick={handleToggle}
                        className={cn('flex-shrink-0 w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 transition-colors', {
                            invisible: !props.hasChild,
                        })}
                    >
                        {props.hasChild && <Icon icon={props.isOpen ? 'ChevronDown' : 'ChevronRight'} className="w-4 h-4 text-gray-600" />}
                    </button>

                    {/* Card */}
                    <div
                        onClick={handleSelect}
                        className={cn('flex-1 bg-white rounded-lg shadow-sm transition-all cursor-pointer p-4 border border-[#A7A7A7]', {
                            'hover:shadow-md hover:scale-[1.01]': !props.disableHover && !props.isSelected,
                            'ring-2 ring-primary shadow-md': props.isSelected,
                        })}
                    >
                        {isEditing ? (
                            <div>
                                <div className="flex items-center justify-between gap-4">
                                    {/* Left: Edit fields */}
                                    <div className="flex flex-row items-center gap-2 flex-1">
                                        <EmojiField value={editEmoji} className="py-0 px-1 h-8" onChange={onEmojiChanged} />
                                        <TextField
                                            ref={textFieldRef}
                                            value={editValue}
                                            className={cn('py-1 px-1 h-8 flex-1', {
                                                'border-red-500 focus:border-red-500 focus:ring-red-500': validationError,
                                            })}
                                            onValueChange={onEditValueChange}
                                            onKeyDown={onKeyDown}
                                        />
                                    </div>

                                    {/* Right: Action buttons (replacing financial info) */}
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <Button variant="default" className="px-3" icon="Check" onClick={onClickAcceptEdit}>
                                            {t('common.save')}
                                        </Button>
                                        <Button variant="outline" className="px-3" icon="Cross1" onClick={onClickCancelEdit}>
                                            {t('common.cancel')}
                                        </Button>
                                        <Button variant="destructive" className="px-3" icon="Trash" onClick={onClickDelete}>
                                            {t('common.delete')}
                                        </Button>
                                    </div>
                                </div>
                                {validationError && (
                                    <div className="text-red-500 text-xs font-medium mt-1 ml-10" role="alert">
                                        {validationError}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex items-center justify-between gap-4">
                                {/* Left: Name and basic info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        {emoji && (
                                            <span className="flex-shrink-0">
                                                <Emoji emoji={emoji} className="text-xl" />
                                            </span>
                                        )}
                                        <h4 className="text-gray-900 font-semibold truncate">{props.node.text}</h4>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-gray-600">
                                        {!props.editable && transactionsCount !== undefined && (
                                            <span>
                                                {transactionsCount} {t('organization.structure.transactionsLabel')}
                                            </span>
                                        )}
                                        {subBommelsCount !== undefined && subBommelsCount > 0 && (
                                            <span className="text-gray-500">
                                                {subBommelsCount} {t('organization.structure.subBommelsLabel')}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Right: Financial info or Edit/Delete buttons */}
                                {!props.editable ? (
                                    <div className="flex items-center gap-4 flex-shrink-0">
                                        {/* Income and Expenses - smaller, side by side */}
                                        <div className="flex items-center gap-3">
                                            <div className="text-right">
                                                <div className="text-[10px] text-gray-500">{t('organization.structure.details.income')}</div>
                                                <div className="text-sm font-medium text-green-600">{formatCurrency(income)}</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-[10px] text-gray-500">{t('organization.structure.details.expenses')}</div>
                                                <div className="text-sm font-medium text-red-600">
                                                    {expenses !== undefined ? `-${Math.abs(expenses).toLocaleString('de-DE')}€` : '-'}
                                                </div>
                                            </div>
                                        </div>
                                        {/* Total - emphasized with border */}
                                        <div className="text-right bg-gray-50 rounded-lg px-3 py-2 border border-[#A7A7A7]">
                                            <div className="text-xs text-gray-500 mb-0.5">{t('organization.structure.details.total')}</div>
                                            <div
                                                className={cn('text-base font-semibold', {
                                                    'text-green-600': total !== undefined && total >= 0,
                                                    'text-red-600': total !== undefined && total < 0,
                                                    'text-gray-900': total === undefined,
                                                })}
                                            >
                                                {formatCurrency(total)}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <Button
                                            variant="outline"
                                            className="px-3"
                                            icon="Pencil1"
                                            onClick={onClickEdit}
                                            disabled={isRoot}
                                            title={isRoot ? t('organization.structure.rootCannotEdit') : undefined}
                                        >
                                            {t('organization.structure.edit')}
                                        </Button>
                                        <Button
                                            variant="outline"
                                            className={cn('px-3', {
                                                'text-red-600 hover:text-red-700 hover:bg-red-50 border-red-300 hover:border-red-400': !isRoot,
                                            })}
                                            icon="Trash"
                                            onClick={onClickDelete}
                                            disabled={isRoot}
                                            title={isRoot ? t('organization.structure.rootCannotDelete') : undefined}
                                        >
                                            {t('common.delete')}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

export default OrganizationTreeNode;
