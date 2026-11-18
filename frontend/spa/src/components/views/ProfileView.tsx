import { zodResolver } from '@hookform/resolvers/zod';
import type { Permission } from '@hopps/api-client';
import { Check, ChevronRight, ExternalLink, Info, KeyRound, Lock, ShieldCheck, Smartphone, Undo2, User } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { SectionCard } from '@/components/common/SectionCard';
import { CARD } from '@/components/Organization/layout';
import { ProfileSkeleton } from '@/components/Profile/ProfileSkeleton';
import { FONT } from '@/components/Transactions/layout';
import Button from '@/components/ui/Button';
import { BaseButton } from '@/components/ui/shadecn/BaseButton';
import TextField from '@/components/ui/TextField';
import { useMyProfile, useUpdateMyProfile } from '@/hooks/queries/useProfile';
import { usePageTitle } from '@/hooks/use-page-title';
import { useToast } from '@/hooks/use-toast';
import { useUnsavedChangesWarning } from '@/hooks/use-unsaved-changes-warning';
import { accountSecurityUrl, isKeycloakProvider } from '@/services/auth/auth.config';
import authService from '@/services/auth/auth.service';

/** Order in which the permissions card lists what a role allows. */
const PERMISSION_ORDER: Permission[] = ['VIEW_BOOKKEEPING', 'EDIT_BOOKKEEPING', 'MANAGE_ORGANIZATION', 'MANAGE_MEMBERS'];

type ProfileValues = { firstName: string; lastName: string; phoneNumber: string };

/** The current user's profile: personal details, role and permissions, and links to the sign-in service's account. */
function ProfileView() {
    const { t } = useTranslation();
    usePageTitle(t('myProfile.title'));
    const { toast } = useToast();
    const { data: profile, isLoading, isError } = useMyProfile();
    const updateProfile = useUpdateMyProfile();
    const securityUrl = accountSecurityUrl();
    const keycloak = isKeycloakProvider();

    const schema = useMemo(
        () =>
            z.object({
                firstName: z.string().trim().min(1, t('organization.details.users.add.firstNameRequired')),
                lastName: z.string().trim().min(1, t('organization.details.users.add.lastNameRequired')),
                phoneNumber: z
                    .string()
                    .trim()
                    .max(40)
                    .regex(/^[0-9+()/. -]*$/, t('myProfile.phoneInvalid')),
            }),
        [t]
    );

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isDirty, dirtyFields, isSubmitting },
    } = useForm<ProfileValues>({ resolver: zodResolver(schema), defaultValues: { firstName: '', lastName: '', phoneNumber: '' } });

    useEffect(() => {
        if (profile) reset({ firstName: profile.firstName ?? '', lastName: profile.lastName ?? '', phoneNumber: profile.phoneNumber ?? '' });
    }, [profile, reset]);

    useUnsavedChangesWarning(isDirty);

    const submit = handleSubmit(async (values) => {
        try {
            await updateProfile.mutateAsync(values);
            toast({ title: t('myProfile.saved'), variant: 'success' });
        } catch (error) {
            console.error('Failed to save profile:', error);
            toast({ title: t('myProfile.saveError'), variant: 'error' });
        }
    });

    if (isLoading) {
        return <ProfileSkeleton />;
    }

    const name = profile ? [profile.firstName, profile.lastName].filter(Boolean).join(' ') : '';
    const initials = profile ? `${profile.firstName?.charAt(0) ?? ''}${profile.lastName?.charAt(0) ?? ''}`.toUpperCase() : '';
    const granted = PERMISSION_ORDER.filter((permission) => profile?.permissions?.includes(permission));

    const discard = () => reset({ firstName: profile?.firstName ?? '', lastName: profile?.lastName ?? '', phoneNumber: profile?.phoneNumber ?? '' });

    return (
        <form onSubmit={submit} className="flex flex-col min-h-full" style={{ fontFamily: FONT }}>
            {/* Sticky page header, as on the organization page: the save action only appears once something changed */}
            <header className="sticky top-0 z-10 -mx-4 sm:-mx-7 mb-[18px] px-4 sm:px-7 pt-1 pb-[18px] border-b border-[#E9E9EE] bg-[#F3F4F6]/85 dark:border-[var(--border-soft)] dark:bg-[#131317]/85 backdrop-blur-[10px]">
                <div className="mx-auto w-full max-w-[940px] flex flex-wrap items-center justify-between gap-4">
                    <h1 className="text-[27px] font-extrabold tracking-[-0.02em] leading-tight text-[#1B1B1F] dark:text-[#F2F2F5]">{t('myProfile.title')}</h1>
                    {isDirty && (
                        <div className="ml-auto flex items-center gap-2.5">
                            <span className="hidden lg:flex items-center gap-2 text-[13.5px] font-bold text-[#B47C18] dark:text-[#E4B75B] whitespace-nowrap">
                                <Info size={16} aria-hidden="true" />
                                {t('organization.details.unsavedChanges', { count: Object.keys(dirtyFields).length })}
                            </span>
                            <BaseButton
                                type="button"
                                variant="ghost"
                                onClick={discard}
                                disabled={isSubmitting}
                                className="gap-2 text-[#6B6B76] dark:text-[#A0A0AC]"
                            >
                                <Undo2 size={15} aria-hidden="true" />
                                {t('myProfile.discard')}
                            </BaseButton>
                            <Button type="submit" disabled={isSubmitting}>
                                <Check size={16} aria-hidden="true" />
                                {isSubmitting ? t('common.loading') : t('myProfile.save')}
                            </Button>
                        </div>
                    )}
                </div>
            </header>

            {isError || !profile ? (
                <p className="mx-auto w-full max-w-[940px] text-[14px] text-[var(--negative)]">{t('myProfile.loadError')}</p>
            ) : (
                <div className="mx-auto w-full max-w-[940px] flex flex-col gap-[18px] pb-8">
                    {/* Who is signed in */}
                    <section className={`${CARD} px-6 py-5 flex items-center gap-[18px]`}>
                        <div className="w-[58px] h-[58px] rounded-[16px] bg-[#F3EAFB] text-[#7E3FB4] dark:bg-[#33204A] dark:text-[#C9A6E6] grid place-items-center flex-shrink-0 text-[20px] font-extrabold">
                            {initials}
                        </div>
                        <div className="flex flex-col gap-[3px] min-w-0">
                            <span className="text-[19px] font-extrabold text-[#1B1B1F] dark:text-[#F2F2F5] truncate">{name}</span>
                            <span className="text-[14px] text-[#6B6B76] dark:text-[#A0A0AC] truncate">{profile.organizationName}</span>
                        </div>
                    </section>

                    {/* Personal details */}
                    <SectionCard icon={<User size={19} aria-hidden="true" />} title={t('myProfile.personal.title')} note={t('myProfile.personal.note')}>
                        <fieldset disabled={isSubmitting} className="grid grid-cols-1 items-start gap-[14px] sm:grid-cols-2">
                            <TextField label={t('myProfile.firstName')} error={errors.firstName?.message} required {...register('firstName')} />
                            <TextField label={t('myProfile.lastName')} error={errors.lastName?.message} required {...register('lastName')} />
                            <div className="flex flex-col gap-1.5">
                                <TextField label={t('myProfile.email')} value={profile.email ?? ''} readOnly />
                                <p className="text-[12.5px] leading-snug text-[#6B6B76] dark:text-[#A0A0AC]">{t('myProfile.emailHint')}</p>
                            </div>
                            <TextField
                                label={t('myProfile.phone')}
                                placeholder={t('myProfile.phonePlaceholder')}
                                error={errors.phoneNumber?.message}
                                {...register('phoneNumber')}
                            />
                        </fieldset>
                    </SectionCard>

                    {/* Role and what it allows */}
                    <SectionCard
                        icon={<ShieldCheck size={19} aria-hidden="true" />}
                        title={t('myProfile.permissions.title')}
                        note={
                            profile.role
                                ? t('myProfile.permissions.note', {
                                      role: t(`organization.details.users.roles.${profile.role}.name`),
                                      organization: profile.organizationName,
                                  })
                                : undefined
                        }
                    >
                        <ul className="flex flex-col gap-2.5">
                            {granted.map((permission) => (
                                <li key={permission} className="flex items-center gap-3 text-[14.5px] text-[#1B1B1F] dark:text-[#F2F2F5]">
                                    <span className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-full bg-[var(--positive-surface)] text-[var(--positive)]">
                                        <Check size={15} aria-hidden="true" />
                                    </span>
                                    {t(`myProfile.permissions.items.${permission}`)}
                                </li>
                            ))}
                        </ul>
                    </SectionCard>

                    {/* Password and two-factor sign-in live at the sign-in service: Keycloak opens the screens in the login
                        flow and returns here, Authentik only has its user settings, opened in a new tab. */}
                    {(keycloak || securityUrl) && (
                        <SectionCard
                            icon={<KeyRound size={19} aria-hidden="true" />}
                            title={t('myProfile.security.title')}
                            note={t(keycloak ? 'myProfile.security.noteKeycloak' : 'myProfile.security.note')}
                        >
                            <div className="flex flex-col divide-y divide-[#E9E9EE] dark:divide-[var(--border-soft)]">
                                {(
                                    [
                                        {
                                            key: 'password',
                                            action: 'UPDATE_PASSWORD',
                                            icon: Lock,
                                            title: t('myProfile.security.password'),
                                            hint: t('myProfile.security.passwordHint'),
                                        },
                                        {
                                            key: 'twoFactor',
                                            action: 'CONFIGURE_TOTP',
                                            icon: Smartphone,
                                            title: t('myProfile.security.twoFactor'),
                                            hint: t('myProfile.security.twoFactorHint'),
                                        },
                                    ] as const
                                ).map((row) => {
                                    const content = (
                                        <>
                                            <span className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-[10px] bg-[#F1F1F4] text-[#6B6B76] dark:bg-[var(--surface-track)] dark:text-[#A0A0AC]">
                                                <row.icon size={18} aria-hidden="true" />
                                            </span>
                                            <span className="flex min-w-0 flex-1 flex-col text-left">
                                                <span className="text-[14.5px] font-bold text-[#1B1B1F] dark:text-[#F2F2F5]">{row.title}</span>
                                                <span className="text-[13px] font-normal text-[#6B6B76] dark:text-[#A0A0AC]">{row.hint}</span>
                                            </span>
                                            {!keycloak && <ExternalLink size={16} aria-hidden="true" className="text-[#9A9AA3]" />}
                                            <ChevronRight size={16} aria-hidden="true" className="text-[#9A9AA3]" />
                                        </>
                                    );
                                    const rowClass =
                                        'flex w-full items-center gap-3.5 rounded-[12px] px-2 py-3 transition-colors hover:bg-[var(--surface-sunken)]';
                                    return (
                                        <div key={row.key} className="py-1">
                                            {keycloak ? (
                                                <BaseButton
                                                    type="button"
                                                    variant="ghost"
                                                    onClick={() =>
                                                        authService
                                                            .startAccountAction(row.action)
                                                            .catch((e) => console.error('Failed to open the account action:', e))
                                                    }
                                                    className={`${rowClass} h-auto justify-start hover:text-inherit`}
                                                >
                                                    {content}
                                                </BaseButton>
                                            ) : (
                                                <a href={securityUrl} target="_blank" rel="noopener noreferrer" className={rowClass}>
                                                    {content}
                                                </a>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </SectionCard>
                    )}
                </div>
            )}
        </form>
    );
}

export default ProfileView;
