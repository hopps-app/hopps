import { PersonIcon } from '@radix-ui/react-icons';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { useStore } from '@/store/store.ts';
import DropdownMenu, { DropdownMenuItem } from '@/components/ui/DropdownMenu.tsx';
import authService from '@/services/auth/auth.service.ts';

function UserMenu() {
    const { user, isAuthenticated } = useStore();
    const { t } = useTranslation();
    const navigate = useNavigate();

    const [menuItems] = useState<DropdownMenuItem[]>([
        { type: 'label', title: user?.name || t('settings.menu.profile') },
        { type: 'separator' },
        { title: `${t('settings.menu.profile')}`, onClick: () => navigate('/settings/profile') },
        { title: `${t('settings.menu.organization')}`, onClick: () => navigate('/settings/organization') },
        { title: `${t('settings.menu.invoices')}`, onClick: () => navigate('/settings/invoices') },
        { type: 'separator' },
        { title: `${t('header.logout')}`, onClick: () => authService.logout().catch((e) => console.error('Failed to logout:', e)) },
    ]);

    return (
        isAuthenticated && (
            <div>
                <DropdownMenu items={menuItems} className="w-56">
                    <div className="flex flex-row items-center gap-1 p-1 rounded dark:hover:bg-primary hover:bg-white hover:cursor-pointer">
                        <div className="flex-shrink-0">
                            <PersonIcon className="w-4 h-4" />
                        </div>

                        <div> {user ? user.name : 'USER'}</div>
                    </div>
                </DropdownMenu>
            </div>
        )
    );
}

export default UserMenu;
