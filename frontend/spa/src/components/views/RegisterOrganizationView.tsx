import { OrganizationRegistrationForm } from '@/components/Forms/OrganizationRegistrationForm/OrganizationRegistrationForm.tsx';

export function RegisterOrganizationView() {
    return (
        <div className="flex justify-center pt-20">
            <div className="w-full sm:w-[600px] bg-white dark:bg-black/20 rounded shadow p-4">
                <OrganizationRegistrationForm />
            </div>
        </div>
    );
}
