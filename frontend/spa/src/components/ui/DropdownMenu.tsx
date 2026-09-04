import * as React from 'react';

import {
    BaseDropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem as BaseDropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator as BaseDropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/shadecn/BaseDropdownMenu.tsx';

type DropdownMenuSeparator = { type: 'separator' };
export type DropdownMenuItem =
    | {
          type?: 'label' | 'item';
          title: string;
          onClick?: () => void;
          icon?: React.ReactNode;
          /** `destructive` marks an item whose effect is hard to undo — logout, delete. */
          variant?: 'default' | 'destructive';
      }
    | DropdownMenuSeparator;

interface DropdownMenuProps {
    items: DropdownMenuItem[];
    label?: string;
    className?: string;
    children?: React.ReactNode;
    /** Which side of the trigger the panel opens on. Defaults to below, as Radix does. */
    side?: 'top' | 'right' | 'bottom' | 'left';
}

const DropdownMenu: React.FC<DropdownMenuProps> = ({ items, label, children, className, side }) => {
    function renderItem(item: DropdownMenuItem, index: number) {
        if (item.type === 'separator') {
            return <BaseDropdownMenuSeparator key={index} />;
        }
        if (item.type === 'label') {
            return <DropdownMenuLabel key={index}>{item.title}</DropdownMenuLabel>;
        }

        return (
            <BaseDropdownMenuItem
                key={index}
                onClick={item.onClick}
                className={item.variant === 'destructive' ? 'text-destructive focus:bg-destructive/10 focus:text-destructive' : undefined}
            >
                {item.icon ? <span className="shrink-0">{item.icon}</span> : null}
                <span>{item.title}</span>
            </BaseDropdownMenuItem>
        );
    }

    return (
        <BaseDropdownMenu>
            <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
            <DropdownMenuContent className={className} align="end" side={side}>
                {label && (
                    <>
                        <DropdownMenuLabel>{label}</DropdownMenuLabel>
                        <BaseDropdownMenuSeparator />
                    </>
                )}
                <DropdownMenuGroup>{items.map(renderItem)}</DropdownMenuGroup>
            </DropdownMenuContent>
        </BaseDropdownMenu>
    );
};

export default DropdownMenu;
