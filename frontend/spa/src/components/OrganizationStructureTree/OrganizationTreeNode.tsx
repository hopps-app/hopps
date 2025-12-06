import { NodeModel, useDragOver } from '@minoru/react-dnd-treeview';
import React, { useState, useRef, useEffect } from 'react';

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
            className={cn('py-2 border-b border-gray-100', {
                'hover:bg-accent': !props.disableHover && !props.isSelected,
                'bg-primary': props.isSelected,
                'text-primary-foreground': props.isSelected,
            })}
            style={{ paddingInlineStart: indent }}
            onMouseEnter={() => setIsHover(true)}
            onMouseLeave={() => setIsHover(false)}
            onClick={handleSelect}
            {...dragOverProps}
        >
            <div className="flex flex-row items-center gap-4">
                {/* Toggle Icon and Content */}
                <div className="flex flex-row items-center flex-1 min-w-0">
                    <div className="scale-150 pr-2 flex-shrink-0" onClick={handleToggle}>
                        {props.hasChild ? (
                            <Icon icon={props.isOpen ? 'TriangleDown' : 'TriangleRight'} className="cursor-pointer hover:text-primary" />
                        ) : (
                            <Icon icon="Dot" />
                        )}
                    </div>

                    <div className="flex-1 min-w-0">
                        {isEditing ? (
                            <div className="flex flex-row items-center gap-1">
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
                            <div className="flex flex-col gap-1">
                                <div className="flex flex-row items-center gap-2">
                                    {emoji && (
                                        <span className="flex-shrink-0">
                                            <Emoji emoji={emoji} className="text-xl" />
                                        </span>
                                    )}
                                    <span className="font-semibold text-sm truncate">{props.node.text}</span>
                                    {isHover && props.editable && (
                                        <div className="flex gap-1 ml-auto">
                                            <Button variant="link" className="px-1" icon="Pencil1" onClick={onClickEdit} />
                                            <Button variant="link" className="px-1" icon="Trash" onClick={onClickDelete} />
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-row items-center gap-2 text-xs text-gray-600">
                                    {receiptsCount !== undefined && <span>{receiptsCount} Belege</span>}
                                    {receiptsOpen !== undefined && receiptsOpen > 0 && (
                                        <span className="bg-gray-200 px-2 py-0.5 rounded-full text-xs">{receiptsOpen} offen</span>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Financial Information Columns */}
                {!isEditing && (
                    <div className="flex flex-row gap-6 text-sm flex-shrink-0">
                        <div className="text-center min-w-[80px]">
                            <div className="font-medium">{subBommelsCount ?? 0}</div>
                        </div>
                        <div className="text-center min-w-[100px]">
                            <div className="font-medium text-green-600">{formatCurrency(income)}</div>
                        </div>
                        <div className="text-center min-w-[100px]">
                            <div className="font-medium text-red-600">{formatCurrency(expenses)}</div>
                        </div>
                        <div className="text-center min-w-[100px]">
                            <div className="font-medium">{formatCurrency(revenue)}</div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default OrganizationTreeNode;
