import * as React from 'react';

import {
    BaseDropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem as BaseDropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator as BaseDropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/shadecn/BaseDropdownMenu';

type DropdownMenuSeparator = { type: 'separator' };
export type DropdownMenuItem =
    | {
          type?: 'label' | 'item';
          title: string;
          onClick?: () => void;
          icon?: React.ReactNode;
      }
    | DropdownMenuSeparator;

interface DropdownMenuProps {
    items: DropdownMenuItem[];
    label?: string;
    className?: string;
    /** Which edge of the trigger the menu opens from. The sidebar footer sits at the
     *  bottom of the viewport, so it opens upward rather than relying on collision flipping. */
    side?: 'top' | 'right' | 'bottom' | 'left';
    align?: 'start' | 'center' | 'end';
    children?: React.ReactNode;
}

const DropdownMenu: React.FC<DropdownMenuProps> = ({ items, label, children, className, side = 'bottom', align = 'end' }) => {
    function renderItem(item: DropdownMenuItem, index: number) {
        if (item.type === 'separator') {
            return <BaseDropdownMenuSeparator key={index} />;
        }
        if (item.type === 'label') {
            return <DropdownMenuLabel key={index}>{item.title}</DropdownMenuLabel>;
        }

        return (
            <BaseDropdownMenuItem key={index} onClick={item.onClick}>
                {item.icon ? <span className="shrink-0">{item.icon}</span> : null}
                <span>{item.title}</span>
            </BaseDropdownMenuItem>
        );
    }

    return (
        <BaseDropdownMenu>
            <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
            <DropdownMenuContent className={className} side={side} align={align}>
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
