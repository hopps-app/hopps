import * as React from 'react';

import ListItem from '@/components/ui/List/ListItem.tsx';
import { RadixIcons } from '@/components/ui/Icon.tsx';
import { cn } from '@/lib/utils.ts';

type ListItemType = {
    title: string;
    icon?: RadixIcons;
    active?: boolean;
    onClick?: () => void;
};

interface ListProps {
    items: ListItemType[];
    className?: string;
    children?: React.ReactNode;
}

const List: React.FC<ListProps> = ({ items, className, children }) => {
    return (
        <ul className={cn('flex flex-col gap-0', className)}>
            {items.map((item, index) => (
                <ListItem
                    key={index}
                    title={item.title}
                    icon={item.icon}
                    onClick={item.onClick}
                    className={cn(
                        'h-10 leading-10 px-4',
                        item.active ? 'bg-accent' : null,
                        item.onClick ? 'hover:cursor-pointer hover:bg-accent hover:text-accent-foreground' : null
                    )}
                />
            ))}
            {children}
        </ul>
    );
};

export default List;
