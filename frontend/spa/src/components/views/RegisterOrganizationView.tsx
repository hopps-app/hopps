import { useState } from 'react';

import { OrganizationRegistrationSuccess } from '@/components/ OrganizationRegistrationSuccess/OrganizationRegistrationSuccess.tsx';
import { OrganizationRegistrationForm } from '@/components/Forms/OrganizationRegistrationForm/OrganizationRegistrationForm.tsx';

export function RegisterOrganizationView() {
    const [isShowSuccess, setIsShowSuccess] = useState(false);
    const handleSuccess = () => {
        setIsShowSuccess(true);
    };

    return (
        <div className="flex justify-center pt-20">
            <div className="w-full sm:w-[600px] bg-background-secondary rounded shadow p-4">
                {isShowSuccess ? <OrganizationRegistrationSuccess /> : <OrganizationRegistrationForm onSuccess={handleSuccess} />}
            </div>
        </div>
    );
}
