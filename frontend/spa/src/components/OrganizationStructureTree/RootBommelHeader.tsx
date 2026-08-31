import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { validateBommelName } from '@/components/BommelTreeView/components/validateBommelName';
import { OrganizationTreeNodeModel } from '@/components/OrganizationStructureTree/OrganizationTreeNodeModel.ts';
import Button from '@/components/ui/Button.tsx';
import Emoji from '@/components/ui/Emoji.tsx';
import EmojiField from '@/components/ui/EmojiField.tsx';
import Icon from '@/components/ui/Icon.tsx';
import TextField from '@/components/ui/TextField.tsx';
import { cn } from '@/lib/utils.ts';

type Props = {
    node: OrganizationTreeNodeModel;
    isSelected: boolean;
    isEditable: boolean;
    onClick: () => void;
    onEdit?: (node: OrganizationTreeNodeModel) => void;
};

const formatCurrency = (value?: number) => {
    if (value === undefined || value === null) return '-';
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toLocaleString('de-DE')}€`;
};

function RootBommelHeader({ node, isSelected, isEditable, onClick, onEdit }: Props) {
    const { t } = useTranslation();
    const { data } = node;
    const emoji = data?.emoji || '';

    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState('');
    const [editEmoji, setEditEmoji] = useState('');
    const [validationError, setValidationError] = useState<string | null>(null);
    const textFieldRef = useRef<HTMLInputElement>(null);

    const onClickEdit = () => {
        if (!isEditable) return;
        setEditValue(node.text);
        setEditEmoji(emoji);
        setIsEditing(true);
    };

    const onEditValueChange = (value: string) => {
        setEditValue(value);
        // Clear validation error when user starts typing valid input
        if (validationError && !validateBommelName(value)) {
            setValidationError(null);
        }
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
        onEdit?.({ ...node, text: editValue.trim(), data: { ...node.data, emoji: editEmoji } });
        setIsEditing(false);
    };

    const onClickCancelEdit = () => {
        setIsEditing(false);
        setEditValue('');
        setValidationError(null);
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

    // Auto-save or cancel when leaving edit mode (clicking "Fertig"), mirroring OrganizationTreeNode
    useEffect(() => {
        if (!isEditable && isEditing) {
            if (validateBommelName(editValue)) {
                onClickCancelEdit();
            } else {
                onClickAcceptEdit();
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isEditable]);

    return (
        <div
            onClick={onClick}
            className={cn('p-4 cursor-pointer transition-all border-b border-white/20', {
                'ring-2 ring-inset ring-white/50': isSelected,
            })}
            style={{ background: 'linear-gradient(to right, var(--purple-500), var(--purple-600))' }}
        >
            {isEditing ? (
                <div onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-between gap-4">
                        {/* Left: Edit fields */}
                        <div className="flex flex-row items-center gap-2 flex-1">
                            <EmojiField value={editEmoji} className="py-0 px-1 h-8" onChange={setEditEmoji} />
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
                        </div>
                    </div>
                    {validationError && (
                        <div className="text-red-200 text-xs font-medium mt-1" role="alert">
                            {validationError}
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex items-center justify-between gap-4">
                    {/* Left: Name and info - clickable to edit in edit mode */}
                    <div
                        className={cn('flex-1 min-w-0', {
                            'cursor-text hover:bg-white/10 rounded-md px-1 -mx-1 transition-colors': isEditable,
                        })}
                        title={isEditable ? t('organization.structure.editRoot') : undefined}
                        onClick={(e) => {
                            if (isEditable) {
                                e.stopPropagation();
                                onClickEdit();
                            }
                        }}
                    >
                        <div className="flex items-center gap-2 mb-1">
                            {emoji ? (
                                <span className="flex-shrink-0">
                                    <Emoji emoji={emoji} className="text-xl" />
                                </span>
                            ) : (
                                // Roots created before this were saved with an empty emoji - without a
                                // placeholder there would be nothing to click to give them one.
                                isEditable && (
                                    <span
                                        aria-label={t('organization.structure.editRoot')}
                                        className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded border border-dashed border-white/60 text-white/70"
                                    >
                                        <Icon icon="Plus" className="w-3 h-3" />
                                    </span>
                                )
                            )}
                            <h4 className="text-white font-semibold truncate">{node.text}</h4>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-white/70">
                            {!isEditable && data?.transactionsCount !== undefined && (
                                <span>
                                    {data.transactionsCount} {t('organization.structure.transactionsLabel')}
                                </span>
                            )}
                            {data?.subBommelsCount !== undefined && data.subBommelsCount > 0 && (
                                <span>
                                    {data.subBommelsCount} {t('organization.structure.subBommelsLabel')}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Right: Financial info */}
                    {!isEditable && (
                        <div className="flex items-center gap-4 flex-shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="text-right">
                                    <div className="text-[10px] text-white/60">{t('organization.structure.details.income')}</div>
                                    <div className="text-sm font-medium text-green-200">{formatCurrency(data?.income)}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-[10px] text-white/60">{t('organization.structure.details.expenses')}</div>
                                    <div className="text-sm font-medium text-red-200">
                                        {data?.expenses !== undefined ? `-${Math.abs(data.expenses).toLocaleString('de-DE')}€` : '-'}
                                    </div>
                                </div>
                            </div>
                            <div className="text-right bg-white/10 rounded-lg px-3 py-2">
                                <div className="text-xs text-white/60 mb-0.5">{t('organization.structure.details.total')}</div>
                                <div
                                    className={cn('text-base font-semibold', {
                                        'text-green-200': data?.total !== undefined && data.total >= 0,
                                        'text-red-200': data?.total !== undefined && data.total < 0,
                                        'text-white': data?.total === undefined,
                                    })}
                                >
                                    {formatCurrency(data?.total)}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default RootBommelHeader;
