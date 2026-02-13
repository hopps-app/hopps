import { PersonIcon } from '@radix-ui/react-icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import DropdownMenu, { DropdownMenuItem } from '@/components/ui/DropdownMenu.tsx';
import Icon from '@/components/ui/Icon';
import authService from '@/services/auth/auth.service.ts';
import { useStore } from '@/store/store.ts';

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
                    <div className="flex flex-row items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors hover:bg-muted dark:hover:bg-primary">
                        <div className="flex-shrink-0">
                            <PersonIcon className="w-5 h-5" />
                        </div>

                        <span className="text-sm font-medium">{user ? user.name : 'USER'}</span>
                    </div>
                </DropdownMenu>
            </div>
        )
    );
}

export default UserMenu;
