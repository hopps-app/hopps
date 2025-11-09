import type { ReactNode } from 'react';

import Icon, { RadixIcons } from '@/components/ui/Icon.tsx';

interface HeaderProps {
    title: string;
    icon?: RadixIcons;
    actions?: ReactNode;
    divider?: boolean;
}

function Header({ title, icon, actions, divider = false }: HeaderProps) {
    return (
        <>
            <div className="flex flex-row justify-between items-center">
                <h1 className="flex flex-row gap-2 items-center text-4xl font-semibold">
                    {icon && <Icon icon={icon} size="md" />}
                    <span>{title}</span>
                </h1>
                {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
            </div>
            {divider && <hr className="mt-4" />}
        </>
    );
}

export default Header;
