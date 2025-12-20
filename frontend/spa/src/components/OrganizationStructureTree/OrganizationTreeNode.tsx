import { NodeModel, useDragOver } from '@minoru/react-dnd-treeview';
import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { OrganizationTreeNodeModel } from '@/components/OrganizationStructureTree/OrganizationTreeNodeModel.ts';
import Button from '@/components/ui/Button.tsx';
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
    onToggle: (id: NodeModel['id']) => void;
    onEdit: (node: OrganizationTreeNodeModel) => void;
    onDelete: (id: NodeModel['id']) => void;
    onSelect: (node: OrganizationTreeNodeModel) => void;
};

const IDENT_SIZE = 32;

function OrganizationTreeNode(props: Props) {
    const { t } = useTranslation();
    const { id, data } = props.node;
    const indent = props.depth * IDENT_SIZE;
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState('');
    const [editEmoji, setEditEmoji] = useState('');
    const [isHover, setIsHover] = useState(false);
    const textFieldRef = useRef<HTMLInputElement>(null);

    const emoji = data?.emoji || '';

    const handleToggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        props.onToggle(props.node.id);
    };

    const handleSelect = () => props.selectable && props.onSelect(props.node);

    const onEditValueChange = (value: string) => {
        setEditValue(value);
    };

    const onEmojiChanged = (value: string) => {
        setEditEmoji(value);
    };

    const onClickEdit = () => {
        if (!props.editable) return;
        setEditValue(props.node.text);
        setEditEmoji(emoji);
        setIsEditing(true);
    };

    const onClickDelete = () => {
        props.onDelete(id);
    };

    const onClickAcceptEdit = () => {
        props.onEdit({ ...props.node, text: editValue, data: { ...props.node.data, emoji: editEmoji } });
        setIsEditing(false);
    };

    const onClickCancelEdit = () => {
        setIsEditing(false);
        setEditValue('');
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

    const dragOverProps = useDragOver(id, props.isOpen, props.onToggle);

    const { receiptsCount, receiptsOpen, subBommelsCount, income, expenses, revenue } = props.node.data || {};

    const formatCurrency = (value?: number) => {
        if (value === undefined || value === null) return '-';
        const sign = value >= 0 ? '+' : '';
        return `${sign}${value.toLocaleString('de-DE')}€`;
    };

    return (
        <div
            className="py-3 select-none group"
            style={{ paddingInlineStart: indent }}
            onMouseEnter={() => setIsHover(true)}
            onMouseLeave={() => setIsHover(false)}
            {...dragOverProps}
        >
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
                    className={cn('flex-1 bg-white rounded-lg shadow-sm transition-all cursor-pointer p-4 border border-gray-200', {
                        'hover:shadow-md hover:scale-[1.01]': !props.disableHover && !props.isSelected,
                        'ring-2 ring-primary shadow-md': props.isSelected,
                    })}
                >
                    {isEditing ? (
                        <div className="flex flex-row items-center gap-2">
                            <EmojiField value={editEmoji} className="py-0 px-1 h-8" onChange={onEmojiChanged} />
                            <TextField
                                ref={textFieldRef}
                                value={editValue}
                                className="py-1 px-1 h-8 flex-1"
                                onValueChange={onEditValueChange}
                                onKeyDown={onKeyDown}
                            />
                            <Button variant="link" className="px-1" icon="Check" onClick={onClickAcceptEdit} />
                            <Button variant="link" className="px-1" icon="Cross1" onClick={onClickCancelEdit} />
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
                                    {isHover && props.editable && (
                                        <div className="flex gap-1 ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button variant="link" className="px-1" icon="Pencil1" onClick={onClickEdit} />
                                            <Button variant="link" className="px-1" icon="Trash" onClick={onClickDelete} />
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-3 text-xs text-gray-600">
                                    {receiptsCount !== undefined && <span>{receiptsCount} Belege</span>}
                                    {receiptsOpen !== undefined && receiptsOpen > 0 && (
                                        <span className="bg-orange-500 text-white px-2 py-0.5 rounded-full">{receiptsOpen} offen</span>
                                    )}
                                    {subBommelsCount !== undefined && subBommelsCount > 0 && (
                                        <span className="text-gray-500">{subBommelsCount} Unterbommel</span>
                                    )}
                                </div>
                            </div>

                            {/* Right: Financial info */}
                            <div className="flex items-center gap-6 flex-shrink-0">
                                <div className="text-right">
                                    <div className="text-xs text-gray-500 mb-0.5">{t('organization.structure.details.income')}</div>
                                    <div className="text-sm font-medium text-green-600">{formatCurrency(income)}</div>
                                </div>

                                <div className="text-right">
                                    <div className="text-xs text-gray-500 mb-0.5">{t('organization.structure.details.expenses')}</div>
                                    <div className="text-sm font-medium text-red-600">{formatCurrency(expenses)}</div>
                                </div>

                                <div className="text-right bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
                                    <div className="text-xs text-gray-500 mb-0.5">{t('organization.structure.details.revenue')}</div>
                                    <div
                                        className={cn('text-base font-semibold', {
                                            'text-green-600': revenue !== undefined && revenue >= 0,
                                            'text-red-600': revenue !== undefined && revenue < 0,
                                            'text-gray-900': revenue === undefined,
                                        })}
                                    >
                                        {formatCurrency(revenue)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default OrganizationTreeNode;
