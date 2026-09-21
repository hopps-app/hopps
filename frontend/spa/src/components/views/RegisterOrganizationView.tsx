import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { OrganizationRegistrationSuccess } from '@/components/ OrganizationRegistrationSuccess/OrganizationRegistrationSuccess.tsx';
import { OrganizationRegistrationForm } from '@/components/Forms/OrganizationRegistrationForm/OrganizationRegistrationForm.tsx';
import Button from '@/components/ui/Button.tsx';
import { useInstance } from '@/hooks/use-instance';
import authService from '@/services/auth/auth.service.ts';
import { fetchInstanceInfo } from '@/services/instance/instanceService';
import { useStore } from '@/store/store';

export function RegisterOrganizationView() {
    const { t } = useTranslation();
    const { tenancy } = useInstance();
    const [isShowSuccess, setIsShowSuccess] = useState(false);
    const handleSuccess = async () => {
        setIsShowSuccess(true);
        if (tenancy === 'single') {
            // The setup is done: from now on the start page shows the login only and /register is closed.
            useStore.getState().setInstance(await fetchInstanceInfo());
        }
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
                        {/* During the initial setup of a single-tenant installation nobody has an account yet. */}
                        {tenancy !== 'single' && (
                            <p className="mt-4 text-center text-sm text-black/70 dark:text-white/70">
                                {t('organization.registration.alreadyHaveAccount')}{' '}
                                <Button variant="link" className="px-0 h-auto align-baseline" onClick={onClickLogin}>
                                    {t('organization.registration.loginInstead')}
                                </Button>
                            </p>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
