import { zodResolver } from '@hookform/resolvers/zod';
import { NewOrganizationInput } from '@hopps/api-client';
import { useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import Button from '@/components/ui/Button.tsx';
import TextField from '@/components/ui/TextField.tsx';
import { useToast } from '@/hooks/use-toast.ts';
import apiService from '@/services/ApiService.ts';

type FormFields = {
    organizationName: string;
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    passwordConfirm: string;
};

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

    const schema = useMemo(
        () =>
            z
                .object({
                    organizationName: z.string().min(1, t('validation.organizationNameRequired')),
                    firstName: z.string().min(1, t('validation.firstNameRequired')),
                    lastName: z.string().min(1, t('validation.lastNameRequired')),
                    email: z.string().email(t('validation.email')),
                    password: z.string().min(8, t('validation.passwordMin')),
                    passwordConfirm: z.string().min(8, t('validation.passwordMin')),
                })
                .refine((data) => data.password === data.passwordConfirm, {
                    message: t('validation.passwordMatch'),
                    path: ['passwordConfirm'],
                }),
        [t]
    );

    const { register, handleSubmit, formState } = useForm<FormFields>({
        mode: 'onBlur',
        resolver: zodResolver(schema),
    });
    const errors = formState.errors;
    const submittingRef = useRef(false);

    async function onSubmit(data: FormFields) {
        if (submittingRef.current) return;
        submittingRef.current = true;
        try {
            await apiService.orgService.organizationPOST(
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
        } finally {
            submittingRef.current = false;
        }
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="">
            <h1 className="text-center">{t('organization.registration.header')}</h1>
            <div className="my-4">
                <TextField label={t('organization.registration.organizationName')} {...register('organizationName')} error={errors.organizationName?.message} />
            </div>
            <div className="my-4">
                <div className="flex flex-row gap-2">
                    <TextField label={t('organization.registration.firstName')} {...register('firstName')} error={errors.firstName?.message} />
                    <TextField label={t('organization.registration.lastName')} {...register('lastName')} error={errors.lastName?.message} />
                </div>
            </div>
            <div className="my-4">
                <TextField label={t('organization.registration.email')} {...register('email')} error={errors.email?.message} />
            </div>
            <div className="my-4">
                <div className="flex flex-row gap-2">
                    <TextField label={t('organization.registration.password')} type="password" {...register('password')} error={errors.password?.message} />
                    <TextField
                        label={t('organization.registration.confirmPassword')}
                        type="password"
                        {...register('passwordConfirm')}
                        error={errors.passwordConfirm?.message}
                    />
                </div>
            </div>

            <hr />
            <div className="mt-2 text-center">
                <Button type="submit" disabled={formState.isSubmitting}>
                    {t('header.register')}
                </Button>
            </div>
        </form>
    );
}
