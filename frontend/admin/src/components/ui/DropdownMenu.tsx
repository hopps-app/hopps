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
          /**
           * Second line under the title. Its presence switches the item to the richer layout — icon in a
           * tinted rounded box, title above description — so plain items elsewhere are unaffected.
           */
          description?: string;
          /** `danger` tints the icon box and title red, marking the action as destructive. */
          tone?: 'default' | 'danger';
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

        const danger = item.tone === 'danger';
        const titleStyle = danger ? { color: 'var(--neg-ink)' } : undefined;

        if (item.description) {
            return (
                <BaseDropdownMenuItem key={index} onClick={item.onClick} className="gap-3 rounded-lg px-3 py-2.5">
                    {item.icon ? (
                        <span
                            className="shrink-0 w-9 h-9 rounded-[10px] grid place-items-center"
                            style={{
                                background: danger ? 'var(--neg-bg)' : 'var(--pp-tint2)',
                                color: danger ? 'var(--neg-ink)' : 'var(--pp-ink)',
                            }}
                        >
                            {item.icon}
                        </span>
                    ) : null}
                    <span className="min-w-0">
                        <span className="block text-[14px] font-bold leading-tight" style={titleStyle}>
                            {item.title}
                        </span>
                        <span className="block text-[12.5px] text-ink-2 leading-tight mt-0.5">{item.description}</span>
                    </span>
                </BaseDropdownMenuItem>
            );
        }

        return (
            <BaseDropdownMenuItem key={index} onClick={item.onClick} style={titleStyle}>
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
