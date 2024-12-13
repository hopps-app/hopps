import { useTranslation } from 'react-i18next';

import authService from '@/services/auth/AuthService.ts';
import Button from '@/components/ui/Button.tsx';
import CheckmarkIcon from '@/components/ OrganizationRegistrationSuccess/CheckmarkIcon.tsx';

export function OrganizationRegistrationSuccess() {
    const { t } = useTranslation();

    const onClickLogin = () => {
        authService.login();
    };

    return (
        <div>
            <div className="flex justify-center">
                <CheckmarkIcon />
            </div>

            <h1 className="mt-4 mb-6 text-center">Your organization has been successfully registered.</h1>
            <div className="text-center">
                <Button onClick={onClickLogin}>{t('header.login')}</Button>
            </div>
        </div>
    );
}
