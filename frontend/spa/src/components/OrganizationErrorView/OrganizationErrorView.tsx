import { useTranslation } from 'react-i18next';

import Button from '@/components/ui/Button';
import authService from '@/services/auth/auth.service';

function OrganizationErrorView() {
    const { t } = useTranslation();

    const handleLogout = async () => {
        try {
            await authService.logout();
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8 text-center">
                <div className="mb-6">
                    <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                        <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.232 18.5c-.77.833.192 2.5 1.732 2.5z"
                            />
                        </svg>
                    </div>
                    <h1 className="text-xl font-semibold text-gray-900 mb-2">{t('organization.noOrganization.title')}</h1>
                    <p className="text-gray-600">{t('organization.noOrganization.message')}</p>
                </div>

                <div className="space-y-4">
                    <div className="text-sm text-gray-500">{t('organization.noOrganization.suggestion')}</div>

                    <Button variant="default" onClick={handleLogout} className="w-full">
                        {t('header.logout')}
                    </Button>
                </div>
            </div>
        </div>
    );
}

export default OrganizationErrorView;
