import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { OrganizationRegistrationSuccess } from '@/components/ OrganizationRegistrationSuccess/OrganizationRegistrationSuccess.tsx';
import { OrganizationRegistrationForm } from '@/components/Forms/OrganizationRegistrationForm/OrganizationRegistrationForm.tsx';
import Button from '@/components/ui/Button.tsx';
import authService from '@/services/auth/auth.service.ts';

export function RegisterOrganizationView() {
    const { t } = useTranslation();
    const [isShowSuccess, setIsShowSuccess] = useState(false);
    const handleSuccess = () => {
        setIsShowSuccess(true);
    };

    const onClickLogin = () => {
        authService.login(`${window.location.origin}/dashboard`);
    };

    return (
        <div className="flex flex-col items-center pt-1">
            <div className="w-full sm:w-[500px] bg-background-secondary rounded-2xl shadow-2xl p-6 mb-8">
                {isShowSuccess ? (
                    <OrganizationRegistrationSuccess />
                ) : (
                    <>
                        <OrganizationRegistrationForm onSuccess={handleSuccess} />
                        <p className="mt-4 text-center text-sm text-black/70 dark:text-white/70">
                            {t('organization.registration.alreadyHaveAccount')}{' '}
                            <Button variant="link" className="px-0 h-auto align-baseline" onClick={onClickLogin}>
                                {t('organization.registration.loginInstead')}
                            </Button>
                        </p>
                    </>
                )}
            </div>
        </div>
    );
}
