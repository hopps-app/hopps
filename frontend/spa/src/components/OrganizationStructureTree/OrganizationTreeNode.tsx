import React, { useState, useRef, useEffect } from 'react';
import { NodeModel, useDragOver } from '@minoru/react-dnd-treeview';

import Icon from '@/components/ui/Icon.tsx';
import TextField from '@/components/ui/TextField.tsx';
import Button from '@/components/ui/Button.tsx';
import { cn } from '@/lib/utils.ts';
import EmojiField from '@/components/ui/EmojiField.tsx';
import { OrganizationTreeNodeModel } from '@/components/OrganizationStructureTree/OrganizationTreeNodeModel.ts';
import Emoji from '@/components/ui/Emoji.tsx';

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
    const [emoji, setEmoji] = useState(data?.emoji || '');
    const [isHover, setIsHover] = useState(false);
    const textFieldRef = useRef<HTMLInputElement>(null);

    const handleToggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        props.onToggle(props.node.id);
    };

    const handleSelect = () => props.selectable && props.onSelect(props.node);

    const onEditValueChange = (value: string) => {
        setEditValue(value);
    };

    const onEmojiChanged = (value: string) => {
        setEmoji(value);
    };

    const onClickEdit = () => {
        if (!props.editable) return;
        setEditValue(props.node.text);
        setIsEditing(true);
    };

    const onClickDelete = () => {
        props.onDelete(id);
    };

    const onClickAcceptEdit = () => {
        props.onEdit({ ...props.node, text: editValue, data: { ...props.node.data, emoji } });
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

    return (
        <div
            className={cn('h-10 leading-10', {
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
            <div className="flex flex-row items-center">
                <div className="scale-150 pr-1" onClick={handleToggle}>
                    {props.hasChild ? (
                        <Icon icon={props.isOpen ? 'TriangleDown' : 'TriangleRight'} className="cursor-pointer hover:text-primary" />
                    ) : (
                        <Icon icon="Dot" />
                    )}
                </div>
                <div className="w-full">
                    {isEditing ? (
                        <div className="flex flex-row items-center w-full">
                            <EmojiField value={emoji} className="py-0 px-1 h-8" onChange={onEmojiChanged} />
                            <TextField
                                ref={textFieldRef}
                                value={editValue}
                                className="py-1 px-1 h-8 w-full"
                                onValueChange={onEditValueChange}
                                onKeyDown={onKeyDown}
                            />
                            <Button variant="link" className="px-1" icon="Check" onClick={onClickAcceptEdit} />
                            <Button variant="link" className="px-1" icon="Cross1" onClick={onClickCancelEdit} />
                        </div>
                    ) : (
                        <div className="flex flex-row items-center">
                            {emoji && (
                                <span className="mr-1">
                                    <Emoji emoji={emoji} className="text-xl" />
                                </span>
                            )}
                            {props.node.text}
                            <div className="flex-grow"></div>
                            {isHover && props.editable && (
                                <>
                                    <Button variant="link" className="px-1" icon="Pencil1" onClick={onClickEdit} />
                                    <Button variant="link" className="px-1" icon="Trash" onClick={onClickDelete} />
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default OrganizationTreeNode;
