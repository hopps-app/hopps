import * as React from 'react';

import './styles/ListItem.scss';
import Button from '@/components/ui/Button.tsx';
import Icon, { RadixIcons } from '@/components/ui/Icon.tsx';
import Progress from '@/components/ui/Progress.tsx';

interface ListItemProps {
    title: string;
    icon?: RadixIcons;
    iconSize?: number | 'md' | 'sm' | 'lg' | undefined;
    index: number;
    active?: boolean;
    onClick?: () => void;
    className?: string;
    onClickRemove?: (index: number) => void;
    isRemovableListItem: boolean;
    progress?: number;
}

const ListItem: React.FC<ListItemProps> = ({ title, icon, iconSize, active, onClick, className, onClickRemove, isRemovableListItem, index, progress = 0 }) => {
    const truncatedTitle = React.useMemo(() => {
        return title.length > 30 ? `${title.substring(0, 30)}...` : title;
    }, [title]);

    return (
        <li onClick={onClick} className={`list-item ${active ? ' bg-accent' : ''} ${className} ${isRemovableListItem ? 'removable-item' : ''}`}>
            <div className="flex items-center justify-between flex-row">
                <div className="flex flex-row gap-2 items-center">
                    {icon && <Icon icon={icon} size={iconSize} />}
                    <span>{truncatedTitle}</span>
                </div>

                {isRemovableListItem && (
                    <Button
                        onClick={() => onClickRemove && onClickRemove(index)}
                        className="min-w-[25px] bg-transparent p-0 flex items-center h-6 text-xs text-[var(--font-color) hover:text-[var(--primary-foreground)]"
                        icon="Cross2"
                    />
                )}
            </div>
            {!!progress && (
                <div className="flex flex-row items-center justify-between max-h-6 gap-16">
                    <Progress className="border solid border-[var(--accent-foreground)]" value={progress} />
                    <span>{progress}%</span>
                </div>
            )}
        </li>
    );
};

export default ListItem;
