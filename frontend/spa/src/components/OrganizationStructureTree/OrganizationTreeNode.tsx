import React, { useState, useRef, useEffect } from 'react';
import { NodeModel, useDragOver } from '@minoru/react-dnd-treeview';

import Icon from '@/components/ui/Icon.tsx';
import TextField from '@/components/ui/TextField.tsx';
import Button from '@/components/ui/Button.tsx';
import { cn } from '@/lib/utils.ts';

type Props = {
    node: NodeModel;
    depth: number;
    isOpen: boolean;
    hasChild: boolean;
    disableHover: boolean;
    onToggle: (id: NodeModel['id']) => void;
    onEdit: (id: NodeModel['id'], text: string) => void;
    onDelete: (id: NodeModel['id']) => void;
};

function OrganizationTreeNode(props: Props) {
    const { id } = props.node;
    const indent = props.depth * 16;
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState('');
    const [isHover, setIsHover] = useState(false);
    const textFieldRef = useRef<HTMLInputElement>(null);

    const handleToggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        props.onToggle(props.node.id);
    };

    const onEditValueChange = (value: string) => {
        setEditValue(value);
    };

    const onClickEdit = () => {
        setEditValue(props.node.text);
        setIsEditing(true);
    };

    const onClickDelete = () => {
        props.onDelete(id);
    };

    const onClickAcceptEdit = () => {
        props.onEdit(id, editValue);
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
            className={cn('h-10 leading-10', { 'hover:bg-accent': !props.disableHover })}
            style={{ paddingInlineStart: indent }}
            onMouseEnter={() => setIsHover(true)}
            onMouseLeave={() => setIsHover(false)}
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
                            <TextField ref={textFieldRef} value={editValue} className="py-1 px-1 w-full" onChange={onEditValueChange} onKeyDown={onKeyDown} />
                            <Button variant="link" className="px-1" icon="Check" onClick={onClickAcceptEdit} />
                            <Button variant="link" className="px-1" icon="Cross1" onClick={onClickCancelEdit} />
                        </div>
                    ) : (
                        <div className="flex flex-row items-center">
                            {props.node.text}
                            <div className="flex-grow"></div>
                            {isHover && (
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
