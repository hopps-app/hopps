import * as React from 'react';
import { useTranslation } from 'react-i18next';

import ListItem from '@/components/ui/List/ListItem.tsx';
import { RadixIcons } from '@/components/ui/Icon.tsx';
import { cn } from '@/lib/utils.ts';

type ListItemType = {
    id: string;
    title: string;
    icon?: RadixIcons;
    iconSize?: string;
    active?: boolean;
    onClick?: () => void;
    progress?: number;
};

interface ListProps {
    items: ListItemType[];
    isRemovableListItem?: boolean;
    onClickRemove?: (id: number | string) => void;
    className?: string;
    children?: React.ReactNode;
}

const List: React.FC<ListProps> = ({ items, className, children, isRemovableListItem, onClickRemove }) => {
    const { t } = useTranslation();
    if (isRemovableListItem && !items.length) return;

    return (
        <ul className={cn('flex flex-col gap-0', className)}>
            {items.length ? (
                items.map((item, index) => (
                    <ListItem
                        key={item.id}
                        title={item.title}
                        icon={item.icon}
                        iconSize={item.iconSize}
                        onClick={item.onClick}
                        onClickRemove={onClickRemove}
                        index={index}
                        isRemovableListItem={isRemovableListItem}
                        progress={item.progress}
                        isLoading={item.progress !== undefined && item.progress < 100}
                        className={cn(
                            'h-10 leading-10 px-4 ',
                            item.active ? 'bg-accent border-l-4 border-primary' : 'pl-[calc(1rem+4px)]',
                            item.onClick ? 'hover:cursor-pointer hover:bg-accent hover:text-accent-foreground' : null,
                            isRemovableListItem ? 'rounded-2xl' : null
                        )}
                    />
                ))
            ) : (
                <p>{t('common.noItems')}</p>
            )}
            {children}
        </ul>
    );
};

export default List;
