import { zodResolver } from '@hookform/resolvers/zod';
import { ApiException, NewOrganizationInput } from '@hopps/api-client';
import { useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { PasswordStrengthMeter } from './PasswordStrengthMeter.tsx';

import { OrganizationFields } from '@/components/Forms/OrganizationFields/OrganizationFields';
import Button from '@/components/ui/Button.tsx';
import TextField from '@/components/ui/TextField.tsx';
import { useInstance } from '@/hooks/use-instance';
import { useToast } from '@/hooks/use-toast.ts';
import { DEFAULT_ORGANIZATION_FIELDS, organizationFieldErrors, type OrganizationFieldValues } from '@/lib/organizationTypes';
import { cn } from '@/lib/utils';
import apiService from '@/services/ApiService.ts';

type FormFields = {
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

    // Two steps: the organization first, then the administrator account that owns it.
    const [step, setStep] = useState<1 | 2>(1);
    const [organization, setOrganization] = useState<OrganizationFieldValues>(DEFAULT_ORGANIZATION_FIELDS);
    const [organizationErrors, setOrganizationErrors] = useState<ReturnType<typeof organizationFieldErrors>>({});

    function goToAdminStep() {
        const fieldErrors = organizationFieldErrors(organization, t);
        setOrganizationErrors(fieldErrors);
        if (Object.keys(fieldErrors).length === 0) setStep(2);
    }

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
                    // The backend derives the currency from the country.
                    organization: {
                        name: organization.name.trim(),
                        type: organization.type,
                        country: organization.country,
                        email: organization.email.trim() || undefined,
                        slug: createSlug(organization.name),
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
                {/* Thin two-part progress bar: done and current segments filled, the step names below. */}
                <div
                    className="mt-4"
                    role="progressbar"
                    aria-valuemin={1}
                    aria-valuemax={2}
                    aria-valuenow={step}
                    aria-valuetext={t('organization.registration.step', { current: step, total: 2 })}
                >
                    <div className="flex gap-1.5">
                        {[1, 2].map((n) => (
                            <div
                                key={n}
                                className={cn('h-[3px] flex-1 rounded-full transition-colors duration-300', n <= step ? 'bg-primary' : 'bg-border-soft')}
                            />
                        ))}
                    </div>
                    <div className="mt-1.5 flex text-[11px] font-semibold text-muted-foreground">
                        {[t('organization.registration.stepOrganization'), t('organization.registration.stepAdmin')].map((label, i) => (
                            <span key={label} className={cn('flex-1', i + 1 === step && 'text-foreground')}>
                                {label}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            {step === 1 ? (
                <>
                    <OrganizationFields value={organization} onChange={setOrganization} errors={organizationErrors} />
                    <div className="mt-6">
                        <Button type="button" className="w-full" onClick={goToAdminStep}>
                            {t('common.next')}
                        </Button>
                    </div>
                </>
            ) : (
                <>
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

                    <div className="mt-6 flex gap-2">
                        <Button type="button" variant="outline" onClick={() => setStep(1)} disabled={formState.isSubmitting}>
                            {t('common.goBack')}
                        </Button>
                        <Button type="submit" className="flex-1" disabled={formState.isSubmitting}>
                            {isSetup ? t('organization.setup.submit') : t('header.register')}
                        </Button>
                    </div>
                </>
            )}
        </form>
    );
}
