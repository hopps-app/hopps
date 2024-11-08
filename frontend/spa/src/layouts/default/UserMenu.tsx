import { FaUser } from 'react-icons/fa';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuthStore } from '@/store/store.ts';
import authService from '@/services/auth/AuthService.ts';
import DropdownMenu, { DropdownMenuItem } from '@/components/ui/DropdownMenu.tsx';

function UserMenu() {
    const authStore = useAuthStore();
    const user = authStore.user;

    const navigate = useNavigate();
    const [menuItems] = useState<DropdownMenuItem[]>([
        { type: 'label', title: 'My Account' },
        { type: 'separator' },
        { title: 'Profile', onClick: () => navigate('/settings/profile') },
        { title: 'Organization', onClick: () => navigate('/settings/organization') },
        { type: 'separator' },
        { title: 'GitHub', onClick: () => console.log('GitHub') },
        { title: 'Support', onClick: () => console.log('Support') },
        { type: 'separator' },
        { title: 'Log out', onClick: () => authService.logout().catch((e) => console.error('Failed to logout:', e)) },
    ]);

    return (
        authStore.isInitialized && (
            <div>
                <DropdownMenu items={menuItems} className="w-56">
                    <div className="flex flex-row items-center gap-1 p-1 rounded dark:hover:bg-primary hover:bg-white hover:cursor-pointer">
                        <div className="flex-shrink-0">
                            <FaUser />
                        </div>

                        <div> {user ? user.name : 'USER'}</div>
                    </div>
                </DropdownMenu>
            </div>
        )
    );
}

export default UserMenu;
