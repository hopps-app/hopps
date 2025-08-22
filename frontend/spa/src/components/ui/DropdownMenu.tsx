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
      }
    | DropdownMenuSeparator;

interface DropdownMenuProps {
    items: DropdownMenuItem[];
    label?: string;
    className?: string;
    children?: React.ReactNode;
}

const DropdownMenu: React.FC<DropdownMenuProps> = ({ items, label, children, className }) => {
    function renderItem(item: DropdownMenuItem, index: number) {
        if (item.type === 'separator') {
            return <BaseDropdownMenuSeparator key={index} />;
        }
        if (item.type === 'label') {
            return <DropdownMenuLabel key={index}>{item.title}</DropdownMenuLabel>;
        }

        return (
            <BaseDropdownMenuItem key={index} onClick={item.onClick}>
                {item.title}
            </BaseDropdownMenuItem>
        );
    }

    return (
        <BaseDropdownMenu>
            <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
            <DropdownMenuContent className={className} align="end">
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
