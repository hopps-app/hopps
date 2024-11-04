import * as React from 'react';

import Icon, { RadixIcons } from '@/components/ui/Icon.tsx';

interface ListItemProps {
    title: string;
    icon?: RadixIcons;
    active?: boolean;
    onClick?: () => void;
    className?: string;
}

const ListItem: React.FC<ListItemProps> = ({ title, icon, active, onClick, className }) => {
    return (
        <li onClick={onClick} className={`list-item${active ? ' bg-accent' : ''}${' ' + className}`}>
            {icon && <Icon icon={icon} />}
            <span>{title}</span>
        </li>
    );
};

export default ListItem;
