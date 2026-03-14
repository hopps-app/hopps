import { zodResolver } from '@hookform/resolvers/zod';
import { ApiException, NewOrganizationInput } from '@hopps/api-client';
import { useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import Button from '@/components/ui/Button.tsx';
import TextField from '@/components/ui/TextField.tsx';
import { useToast } from '@/hooks/use-toast.ts';
import apiService from '@/services/ApiService.ts';
import { isAlphaVersion } from '@/utils/featureFlags';

type FormFields = {
    organizationName: string;
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    passwordConfirm: string;
    alphaConsent: boolean;
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

    const alphaEnabled = isAlphaVersion();

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
                    alphaConsent: alphaEnabled ? z.literal(true, { message: t('alpha.consentRequired') }) : z.boolean(),
                })
                .refine((data) => data.password === data.passwordConfirm, {
                    message: t('validation.passwordMatch'),
                    path: ['passwordConfirm'],
                }),
        [t, alphaEnabled]
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
            if (ApiException.isApiException(e) && e.status === 409) {
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
        <form onSubmit={handleSubmit(onSubmit)} className="">
            <h1 className="text-center">{t('organization.registration.header')}</h1>
            <div className="mt-4 mb-2">
                <TextField
                    label={t('organization.registration.organizationName')}
                    {...register('organizationName')}
                    error={errors.organizationName?.message}
                    autoComplete="organization"
                />
            </div>
            <div className="mt-4">
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
            <div className="mt-4">
                <TextField label={t('organization.registration.email')} {...register('email')} error={errors.email?.message} autoComplete="email" />
            </div>
            <div className="mt-4">
                <div className="flex flex-row gap-2">
                    <TextField
                        label={t('organization.registration.password')}
                        type="password"
                        {...register('password')}
                        error={errors.password?.message}
                        autoComplete="new-password"
                    />
                    <TextField
                        label={t('organization.registration.confirmPassword')}
                        type="password"
                        {...register('passwordConfirm')}
                        error={errors.passwordConfirm?.message}
                        autoComplete="new-password"
                    />
                </div>
            </div>

            {alphaEnabled && (
                <div className="mt-6 rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-900/30">
                    <p className="text-sm text-amber-800 dark:text-amber-200 mb-3">{t('alpha.consentText')}</p>
                    <label className="flex items-start gap-2 cursor-pointer">
                        <input type="checkbox" {...register('alphaConsent')} className="mt-0.5 h-4 w-4 rounded border-amber-400 accent-primary" />
                        <span className="text-sm text-amber-900 dark:text-amber-100">{t('alpha.consentLabel')}</span>
                    </label>
                    {errors.alphaConsent && <p className="mt-1 text-xs text-red-600">{errors.alphaConsent.message}</p>}
                </div>
            )}

            <hr />
            <div className="mt-2 text-center">
                <Button type="submit" disabled={formState.isSubmitting}>
                    {t('header.register')}
                </Button>
            </div>
        </form>
    );
}
