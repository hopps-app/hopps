import { OrganizationRegistrationForm } from '@/components/Forms/OrganizationRegistrationForm/OrganizationRegistrationForm.tsx';

export function RegisterOrganizationView() {
    return (
        <div className="flex justify-center items-center">
            <div className="w-[300px] rounded bg-white/10 p-4">
                <OrganizationRegistrationForm />
            </div>
        </div>
    );
}
