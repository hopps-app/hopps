import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';

import TextField from '@/components/ui/TextField.tsx';
import Button from '@/components/ui/Button.tsx';
import apiService from '@/services/ApiService.ts';
import { useToast } from '@/hooks/use-toast.ts';

const schema = z.object({
    organizationName: z.string().min(1, 'Organization name is required'),
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    email: z.string().email('Invalid email address'),
});

type FormFields = z.infer<typeof schema>;

export function OrganizationRegistrationForm() {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { showError, showSuccess } = useToast();
    const { register, handleSubmit, formState } = useForm<FormFields>({
        mode: 'onBlur',
        resolver: zodResolver(schema),
    });
    const errors = formState.errors;

    async function onSubmit(data: FormFields) {
        try {
            await apiService.organization.registerOrganization({
                owner: {
                    firstName: data.firstName,
                    lastName: data.lastName,
                    email: data.email,
                },
                organization: {
                    name: data.organizationName,
                    type: 'EINGETRAGENER_VEREIN',
                    slug: apiService.organization.createSlug(data.organizationName),
                },
            });

            showSuccess({ description: 'Organisation successfully created' });
            navigate('/login');
        } catch (e) {
            console.error(e);
            showError({ title: 'Error', description: 'Failed to register organization' });
        }
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="">
            <div className="my-4">
                <TextField label="Organization name" {...register('organizationName')} error={errors.organizationName?.message} />
            </div>
            <div className="my-4">
                <TextField label="Account First Name" {...register('firstName')} error={errors.firstName?.message} />
            </div>
            <div className="my-4">
                <TextField label="Account Last Name" {...register('lastName')} error={errors.lastName?.message} />
            </div>
            <div className="my-4">
                <TextField label="Account email" {...register('email')} error={errors.email?.message} />
            </div>

            <hr />
            <div className="mt-2 text-center">
                <Button type="submit">{t('header.register')}</Button>
            </div>
        </form>
    );
}
