import { useTranslation } from 'react-i18next';

import CheckmarkIcon from '@/components/ OrganizationRegistrationSuccess/CheckmarkIcon.tsx';
import Button from '@/components/ui/Button.tsx';
import authService from '@/services/auth/auth.service.ts';

export function OrganizationRegistrationSuccess() {
    const { t } = useTranslation();

    const onClickLogin = () => {
        authService.login(`${window.location.origin}/dashboard`);
    };

    return (
        <div className="flex flex-col items-center justify-center py-12 px-4">
            <CheckmarkIcon className="w-16 h-16 mb-6" />
            <h2 className="text-lg font-semibold text-black mb-6 text-center">
                {t('organization.registration.successHeading')}
            </h2>
            <Button onClick={onClickLogin}>{t('header.login')}</Button>
        </div>
    );
}
