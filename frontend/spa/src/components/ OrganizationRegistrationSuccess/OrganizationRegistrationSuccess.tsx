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
        <div>
            <div className="flex justify-center">
                <CheckmarkIcon className="w-16 h-16" />
            </div>

            <h2 className="mt-3 mb-4 text-center">{t('organization.registration.successHeading')}</h2>
            <div className="text-center">
                <Button onClick={onClickLogin}>{t('header.login')}</Button>
            </div>
        </div>
    );
}
