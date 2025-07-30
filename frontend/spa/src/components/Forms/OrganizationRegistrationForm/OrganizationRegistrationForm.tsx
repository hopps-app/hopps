import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { NewOrganizationInput } from '@hopps/api-client';

import Button from '@/components/ui/Button.tsx';
import TextField from '@/components/ui/TextField.tsx';
import { useToast } from '@/hooks/use-toast.ts';
import apiService from '@/services/ApiService.ts';

const schema = z
    .object({
        organizationName: z.string().min(1, 'Organization name is required'),
        firstName: z.string().min(1, 'First name is required'),
        lastName: z.string().min(1, 'Last name is required'),
        email: z.string().email('Invalid email address'),
        password: z.string().min(8, 'Password must be at least 8 characters long'),
        passwordConfirm: z.string().min(8, 'Password must be at least 8 characters long'),
    })
    .refine((data) => data.password === data.passwordConfirm, {
        message: "Passwords don't match",
        path: ['passwordConfirm'],
    });

type FormFields = z.infer<typeof schema>;

type Props = {
    onSuccess: () => void;
};

function createSlug(input: string): string {
    return input
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
        .trim()
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-'); // Replace multiple hyphens with a single hyphen
}

export function OrganizationRegistrationForm(props: Props) {
    const { t } = useTranslation();
    const { showError, showSuccess } = useToast();
    const { register, handleSubmit, formState } = useForm<FormFields>({
        mode: 'onBlur',
        resolver: zodResolver(schema),
    });
    const errors = formState.errors;

    async function onSubmit(data: FormFields) {
        try {
            await apiService.organization.organizationPOST(
                NewOrganizationInput.fromJS({
                    owner: {
                        firstName: data.firstName,
                        lastName: data.lastName,

                        email: data.email,
                    },
                    organization: {
                        name: data.organizationName,
                        type: 'EINGETRAGENER_VEREIN',
                        slug: createSlug(data.organizationName),
                    },
                    newPassword: data.password,
                })
            );

            showSuccess(t('organization.registration.success'));
            props.onSuccess();
        } catch (e) {
            console.error(e);
            showError(t('organization.registration.failed'));
        }
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="">
            <h1 className="text-center">{t('organization.registration.header')}</h1>
            <div className="my-4">
                <TextField label="Organization name" {...register('organizationName')} error={errors.organizationName?.message} />
            </div>
            <div className="my-4">
                <div className="flex flex-row gap-2">
                    <TextField label="Account First Name" {...register('firstName')} error={errors.firstName?.message} />
                    <TextField label="Account Last Name" {...register('lastName')} error={errors.lastName?.message} />
                </div>
            </div>
            <div className="my-4">
                <TextField label="Account email" {...register('email')} error={errors.email?.message} />
            </div>
            <div className="my-4">
                <div className="flex flex-row gap-2">
                    <TextField label="Account password" type="password" {...register('password')} error={errors.password?.message} />
                    <TextField label="Confirm password" type="password" {...register('passwordConfirm')} error={errors.passwordConfirm?.message} />
                </div>
            </div>

            <hr />
            <div className="mt-2 text-center">
                <Button type="submit">{t('header.register')}</Button>
            </div>
        </form>
    );
}
