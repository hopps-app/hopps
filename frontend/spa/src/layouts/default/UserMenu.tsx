import { PersonIcon } from '@radix-ui/react-icons';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { useStore } from '@/store/store.ts';
import DropdownMenu, { DropdownMenuItem } from '@/components/ui/DropdownMenu.tsx';
import authService from '@/services/auth/auth.service.ts';
import Icon from '@/components/ui/Icon';

function UserMenu() {
    const { user, isAuthenticated } = useStore();
    const { t } = useTranslation();
    const navigate = useNavigate();

    const [menuItems] = useState<DropdownMenuItem[]>([
        { title: `${t('settings.menu.profile')}`, onClick: () => navigate('/profile'), icon: <Icon icon="Avatar" /> },
        { title: `${t('header.logout')}`, onClick: () => authService.logout().catch((e) => console.error('Failed to logout:', e)), icon: <Icon icon="Exit" /> },
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
