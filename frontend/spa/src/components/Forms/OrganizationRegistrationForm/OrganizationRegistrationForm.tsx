import { zodResolver } from '@hookform/resolvers/zod';
import { ApiException, NewOrganizationInput } from '@hopps/api-client';
import { useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { PasswordStrengthMeter } from './PasswordStrengthMeter.tsx';

import Button from '@/components/ui/Button.tsx';
import TextField from '@/components/ui/TextField.tsx';
import { useInstance } from '@/hooks/use-instance';
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
    // On a single-tenant installation this same form is the one-time initial setup, and reads as such.
    const isSetup = useInstance().tenancy === 'single';

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

    const { register, handleSubmit, watch, formState } = useForm<FormFields>({
        mode: 'onSubmit',
        reValidateMode: 'onChange',
        resolver: zodResolver(schema),
    });
    const errors = formState.errors;
    const submittingRef = useRef(false);
    const password = watch('password') ?? '';

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
            if (ApiException.isApiException(e) && e.status === 403) {
                // Single-tenant installation whose organization already exists (code SETUP_COMPLETE).
                showError(t('organization.setup.alreadyDone'));
            } else if (ApiException.isApiException(e) && e.status === 409) {
                try {
                    const body = JSON.parse(e.response);
                    const fields: string[] = body.conflictingFields ?? [];
                    const hasEmail = fields.includes('email');
                    const hasSlug = fields.includes('slug');
                    if (hasEmail && hasSlug) {
                        showError(t('organization.registration.emailAndOrganizationAlreadyExist'));
                    } else if (hasEmail) {
                        showError(t('organization.registration.emailAlreadyRegistered'));
                    } else if (hasSlug) {
                        showError(t('organization.registration.organizationAlreadyExists'));
                    } else {
                        showError(t('organization.registration.failed'));
                    }
                } catch {
                    showError(t('organization.registration.failed'));
                }
            } else {
                showError(t('organization.registration.failed'));
            }
        } finally {
            submittingRef.current = false;
        }
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <div className="mb-4">
                <h1 className="text-xl font-semibold text-left">{isSetup ? t('organization.setup.header') : t('organization.registration.header')}</h1>
                <p className="mt-1 text-sm text-muted text-left">{isSetup ? t('organization.setup.subtitle') : t('organization.registration.subtitle')}</p>
            </div>
            <div>
                <TextField
                    label={t('organization.registration.organizationName')}
                    {...register('organizationName')}
                    error={errors.organizationName?.message}
                    autoComplete="organization"
                />
            </div>
            <div className="mt-3">
                <div className="flex flex-row gap-2">
                    <TextField
                        label={t('organization.registration.firstName')}
                        {...register('firstName')}
                        error={errors.firstName?.message}
                        autoComplete="given-name"
                    />
                    <TextField
                        label={t('organization.registration.lastName')}
                        {...register('lastName')}
                        error={errors.lastName?.message}
                        autoComplete="family-name"
                    />
                </div>
            </div>
            <div className="mt-3">
                <TextField label={t('organization.registration.email')} {...register('email')} error={errors.email?.message} autoComplete="email" />
            </div>
            <div className="mt-3">
                <TextField
                    label={t('organization.registration.password')}
                    type="password"
                    {...register('password')}
                    error={errors.password?.message}
                    autoComplete="new-password"
                />
                <PasswordStrengthMeter password={password} />
            </div>
            <div className="mt-3">
                <TextField
                    label={t('organization.registration.confirmPassword')}
                    type="password"
                    {...register('passwordConfirm')}
                    error={errors.passwordConfirm?.message}
                    autoComplete="new-password"
                />
            </div>

            <div className="mt-6">
                <Button type="submit" className="w-full" disabled={formState.isSubmitting}>
                    {isSetup ? t('organization.setup.submit') : t('header.register')}
                </Button>
            </div>
        </form>
    );
}
