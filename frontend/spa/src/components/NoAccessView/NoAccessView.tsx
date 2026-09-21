import { useTranslation } from 'react-i18next';

import Button from '@/components/ui/Button';
import { useInstance } from '@/hooks/use-instance';
import authService from '@/services/auth/auth.service';
import { useStore } from '@/store/store';

/**
 * Shown on a single-tenant installation to someone who could log in (Keycloak or a brokered identity provider knows
 * them) but is not a member of the one organization. There is nothing they can do here except get invited, so unlike
 * the multi-tenant {@code OrganizationErrorView} this offers no way to create an organization.
 */
function NoAccessView() {
    const { t } = useTranslation();
    const { organizationName } = useInstance();
    const user = useStore((state) => state.user);

    const handleLogout = async () => {
        try {
            await authService.logout();
        } catch (err) {
            console.error('Logout failed:', err);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <div className="max-w-md w-full bg-white shadow-lg rounded-[30px] p-8 text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 mb-4">
                    <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                        />
                    </svg>
                </div>
                <h1 className="text-xl font-semibold text-gray-900 mb-2">{t('organization.noAccess.title')}</h1>
                <p className="text-gray-600 text-sm mb-2">
                    {organizationName ? t('organization.noAccess.message', { organization: organizationName }) : t('organization.noAccess.messageUnnamed')}
                </p>
                <p className="text-gray-600 text-sm mb-6">{t('organization.noAccess.suggestion')}</p>
                {user?.email && <p className="text-xs text-gray-400 mb-4">{t('organization.noAccess.signedInAs', { email: user.email })}</p>}
                <Button type="button" variant="outline" onClick={handleLogout} className="w-full">
                    {t('header.logout')}
                </Button>
            </div>
        </div>
    );
}

export default NoAccessView;
