import { zodResolver } from '@hookform/resolvers/zod';
import { Address, ApiException, Member, NewMemberInput, OrganizationInput, OrganizationType } from '@hopps/api-client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Check, Globe, ImageIcon, Info, Landmark, Undo2, Upload, UserPlus, Users } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { LoadingState } from '@/components/common/LoadingState';
import { AddUserDialog, type NewUserValues } from '@/components/Organization/AddUserDialog';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import Select from '@/components/ui/Select';
import TextField from '@/components/ui/TextField';
import { useCountries } from '@/hooks/use-countries';
import { usePageTitle } from '@/hooks/use-page-title';
import { useToast } from '@/hooks/use-toast';
import { useUnsavedChangesWarning } from '@/hooks/use-unsaved-changes-warning';
import apiService from '@/services/ApiService';
import { useStore } from '@/store/store';

/** Design system: "Klar" — see the hopps design system tokens (colors.css / typography.css). */
const FONT = '"Hanken Grotesk", "Reddit Sans", sans-serif';

const CARD = 'rounded-[18px] bg-white shadow-[0_1px_2px_rgba(20,20,40,0.05),0_6px_22px_rgba(20,20,40,0.05)]';

/** Field widths follow the design's 6-column grid; everything collapses to full width on small screens. */
const SPAN: Record<number, string> = {
    1: 'col-span-2 md:col-span-1',
    2: 'col-span-2 md:col-span-2',
    3: 'col-span-2 md:col-span-3',
    4: 'col-span-2 md:col-span-4',
    6: 'col-span-2 md:col-span-6',
};

function isoToGerman(iso: string): string {
    const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return iso;
    return `${match[3]}.${match[2]}.${match[1]}`;
}

function germanToIso(german: string): string {
    const match = german.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    if (!match) return german;
    return `${match[3]}-${match[2]}-${match[1]}`;
}

// ─── Layout primitives ────────────────────────────────────────────────────────

function SectionCard({
    icon,
    title,
    note,
    action,
    children,
}: {
    icon: React.ReactNode;
    title: string;
    note?: string;
    /** Rendered top right of the card header. */
    action?: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <section className={`${CARD} px-6 py-[22px] flex flex-col gap-4`}>
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-[13px] min-w-0">
                    <div className="w-9 h-9 rounded-[10px] bg-[#F1F1F4] text-[#6B6B76] grid place-items-center flex-shrink-0">{icon}</div>
                    <div className="flex flex-col gap-[3px] min-w-0">
                        <span className="text-[16.5px] font-extrabold tracking-[-0.01em] text-[#1B1B1F]">{title}</span>
                        {note && <span className="text-[13.5px] text-[#6B6B76]">{note}</span>}
                    </div>
                </div>
                {action}
            </div>
            {children}
        </section>
    );
}

function FieldGrid({ children }: { children: React.ReactNode }) {
    return <div className="grid grid-cols-2 md:grid-cols-6 gap-[14px]">{children}</div>;
}

/** Positions a field in the 6-column grid and renders the design's optional hint line underneath. */
function GridField({ span, hint, children }: { span: number; hint?: string; children: React.ReactNode }) {
    return (
        <div className={SPAN[span]}>
            {children}
            {hint && <p className="mt-1 text-[12.5px] leading-snug text-[#6B6B76]">{hint}</p>}
        </div>
    );
}

const AVATAR_TONES = [
    { bg: '#F3EAFB', fg: '#7E3FB4' },
    { bg: '#E7F4EC', fg: '#1F7A50' },
    { bg: '#FBF1DD', fg: '#B47C18' },
    { bg: '#F1F1F4', fg: '#6B6B76' },
];

const USER_ROW_GRID = 'grid grid-cols-[minmax(150px,1.5fr)_minmax(110px,1fr)_minmax(150px,1.4fr)] gap-3';

function UserAvatar({ name }: { name: string }) {
    const initials =
        name
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0]?.toUpperCase() ?? '')
            .join('') || '?';
    const tone = AVATAR_TONES[[...name].reduce((sum, char) => sum + char.charCodeAt(0), 0) % AVATAR_TONES.length];
    return (
        <span
            aria-hidden="true"
            className="w-[30px] h-[30px] rounded-full grid place-items-center text-[12px] font-extrabold flex-shrink-0"
            style={{ background: tone.bg, color: tone.fg }}
        >
            {initials}
        </span>
    );
}

/** Mirrors the server-side allow-list in OrganizationLogoService. */
const LOGO_ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml'];
const LOGO_MAX_SIZE_BYTES = 2 * 1024 * 1024;

/**
 * Vereinslogo card. Picking a file only stages it — the preview switches to the chosen file and the form becomes
 * dirty; the upload itself happens when the user saves.
 */
function LogoCard({
    pendingFile,
    onFileSelected,
    version,
    disabled,
}: {
    pendingFile: File | null;
    onFileSelected: (file: File) => void;
    /** Bumped after a save so a replaced logo is re-fetched even though hasLogo stayed true. */
    version: number;
    disabled: boolean;
}) {
    const { t } = useTranslation();
    const organization = useStore((state) => state.organization);
    const inputRef = useRef<HTMLInputElement>(null);
    const [storedUrl, setStoredUrl] = useState<string | null>(null);

    const hasLogo = !!organization?.hasLogo;

    // A staged file is previewed straight from disk, so nothing is uploaded before the user saves.
    const pendingUrl = useMemo(() => (pendingFile ? URL.createObjectURL(pendingFile) : null), [pendingFile]);
    useEffect(() => {
        return () => {
            if (pendingUrl) URL.revokeObjectURL(pendingUrl);
        };
    }, [pendingUrl]);

    useEffect(() => {
        if (!hasLogo || pendingFile) return;

        let objectUrl: string | null = null;
        let cancelled = false;

        apiService.orgService
            .logoGET()
            .then((res) => {
                if (cancelled) return;
                objectUrl = URL.createObjectURL(res.data);
                setStoredUrl(objectUrl);
            })
            .catch(() => {
                // 404 = the key is on the organization but the object is gone; fall back to the placeholder.
                if (!cancelled) setStoredUrl(null);
            });

        return () => {
            cancelled = true;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
            // Drop the revoked URL so a replaced logo isn't rendered from a dead object URL.
            setStoredUrl(null);
        };
    }, [hasLogo, pendingFile, version]);

    const previewUrl = pendingUrl ?? storedUrl;

    function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        // Reset the input so picking the same file again still fires a change event.
        event.target.value = '';
        if (file) onFileSelected(file);
    }

    return (
        <section className={`${CARD} px-6 py-5 flex flex-wrap items-center gap-[18px]`}>
            <div className="w-[58px] h-[58px] rounded-[16px] bg-[#F3EAFB] text-[#7E3FB4] grid place-items-center flex-shrink-0 overflow-hidden">
                {previewUrl ? (
                    <img src={previewUrl} alt={t('organization.details.logo.alt')} className="w-full h-full object-contain" />
                ) : (
                    <ImageIcon size={26} aria-hidden="true" />
                )}
            </div>
            <div className="flex flex-col gap-1 min-w-0">
                <span className="text-[15px] font-extrabold tracking-[-0.01em] text-[#1B1B1F]">{t('organization.details.logo.title')}</span>
                <span className="text-[13.5px] text-[#6B6B76]">
                    {pendingFile ? t('organization.details.logo.pending', { name: pendingFile.name }) : t('organization.details.logo.note')}
                </span>
            </div>
            <div className="flex-1" />
            <input
                ref={inputRef}
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,.png,.jpg,.jpeg,.svg"
                className="hidden"
                onChange={handleChange}
                aria-hidden="true"
                tabIndex={-1}
            />
            <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={disabled}
                className="inline-flex items-center gap-2 rounded-full border border-[#E0E0E6] bg-white px-4 py-2 text-[13.5px] font-bold text-[#1B1B1F] hover:border-[#9A9AA3] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <Upload size={16} />
                {hasLogo || pendingFile ? t('organization.details.logo.replace') : t('organization.details.logo.upload')}
            </button>
        </section>
    );
}

// ─── View ─────────────────────────────────────────────────────────────────────

function OrganizationDetailsSettingsView() {
    const { t } = useTranslation();
    usePageTitle(t('organization.details.title'));
    const { toast } = useToast();
    const organization = useStore((state) => state.organization);
    const countryOptions = useCountries();
    const setOrganization = useStore((state) => state.setOrganization);
    const queryClient = useQueryClient();

    // Order mirrors app.hopps.organization.domain.OrganizationType — most common legal form first, fallback last.
    const typeOptions = useMemo(
        () => [
            { label: t('organization.details.typeEV'), value: 'EINGETRAGENER_VEREIN' },
            { label: t('organization.details.typeGGmbH'), value: 'GEMEINNUETZIGE_GMBH' },
            { label: t('organization.details.typeStiftung'), value: 'STIFTUNG' },
            { label: t('organization.details.typeEG'), value: 'GEMEINNUETZIGE_GENOSSENSCHAFT' },
            { label: t('organization.details.typeGUG'), value: 'GEMEINNUETZIGE_UG' },
            { label: t('organization.details.typeAndere'), value: 'ANDERE' },
        ],
        [t]
    );

    const schema = useMemo(
        () =>
            z.object({
                name: z.string().min(1, t('organization.details.nameRequired')),
                type: z.string().min(1),
                website: z.string().optional(),
                street: z.string().optional(),
                number: z.string().optional(),
                city: z.string().optional(),
                plz: z.string().optional(),
                additionalLine: z.string().optional(),
                foundingDate: z
                    .string()
                    .optional()
                    .refine((val) => !val || /^\d{2}\.\d{2}\.\d{4}$/.test(val), {
                        message: t('organization.details.foundingDateFormat'),
                    }),
                registrationCourt: z.string().optional(),
                registrationNumber: z.string().optional(),
                country: z.string().optional(),
                taxNumber: z.string().optional(),
                email: z.string().optional(),
                phoneNumber: z.string().optional(),
            }),
        [t]
    );

    type FormValues = z.infer<typeof schema>;

    const {
        register,
        handleSubmit,
        reset,
        control,
        formState: { errors, isSubmitting, isDirty, dirtyFields },
    } = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: {
            name: '',
            type: 'EINGETRAGENER_VEREIN',
            website: '',
            street: '',
            number: '',
            city: '',
            plz: '',
            additionalLine: '',
            foundingDate: '',
            registrationCourt: '',
            registrationNumber: '',
            country: 'DE',
            taxNumber: '',
            email: '',
            phoneNumber: '',
        },
    });

    // A logo picked but not yet uploaded. It counts towards the unsaved changes and goes up on submit.
    const [pendingLogo, setPendingLogo] = useState<File | null>(null);
    const [logoVersion, setLogoVersion] = useState(0);
    const [addUserOpen, setAddUserOpen] = useState(false);

    const handleAddUser = useCallback(
        async (values: NewUserValues) => {
            const input = new NewMemberInput();
            input.firstName = values.firstName;
            input.lastName = values.lastName;
            input.email = values.email;
            input.position = values.position || undefined;

            try {
                await apiService.orgService.addOrganizationMember(input);
            } catch (error) {
                console.error('Failed to add member:', error);
                const duplicate = ApiException.isApiException(error) && error.status === 409;
                toast({
                    title: t(`organization.details.users.add.${duplicate ? 'duplicate' : 'error'}`),
                    variant: 'error',
                });
                // Rethrow so the dialog stays open and the entered values are not lost.
                throw error;
            }

            await queryClient.invalidateQueries({ queryKey: ['organization', organization?.slug, 'members'] });
            toast({ title: t('organization.details.users.add.success'), variant: 'success' });
        },
        [organization?.slug, queryClient, t, toast]
    );

    const hasChanges = isDirty || pendingLogo !== null;
    const dirtyCount = Object.keys(dirtyFields).length + (pendingLogo ? 1 : 0);

    useUnsavedChangesWarning(hasChanges);

    const handleLogoSelected = useCallback(
        (file: File) => {
            // Check locally what the server checks too, so an unusable file is caught before the user hits save.
            if (!LOGO_ACCEPTED_TYPES.includes(file.type)) {
                toast({ title: t('organization.details.logo.errorType'), variant: 'error' });
                return;
            }
            if (file.size > LOGO_MAX_SIZE_BYTES) {
                toast({ title: t('organization.details.logo.errorTooLarge'), variant: 'error' });
                return;
            }
            setPendingLogo(file);
        },
        [t, toast]
    );

    const discardChanges = useCallback(() => {
        reset();
        setPendingLogo(null);
    }, [reset]);

    // Load organization data from store into form
    useEffect(() => {
        if (organization) {
            const raw = organization.foundingDate;
            let dateStr = '';
            if (raw) {
                const d = raw instanceof Date ? raw : new Date(String(raw));
                if (!isNaN(d.getTime())) {
                    const year = d.getFullYear();
                    const month = String(d.getMonth() + 1).padStart(2, '0');
                    const day = String(d.getDate()).padStart(2, '0');
                    dateStr = isoToGerman(`${year}-${month}-${day}`);
                }
            }
            reset({
                name: organization.name || '',
                type: organization.type || 'EINGETRAGENER_VEREIN',
                website: organization.website || '',
                street: organization.address?.street || '',
                number: organization.address?.number || '',
                city: organization.address?.city || '',
                plz: organization.address?.plz || '',
                additionalLine: organization.address?.additionalLine || '',
                foundingDate: dateStr,
                registrationCourt: organization.registrationCourt || '',
                registrationNumber: organization.registrationNumber || '',
                country: organization.country || 'DE',
                taxNumber: organization.taxNumber || '',
                email: organization.email || '',
                phoneNumber: organization.phoneNumber || '',
            });
        }
    }, [organization, reset]);

    // Reload from API if no org data in store
    useEffect(() => {
        if (!organization) {
            apiService.orgService
                .myGET()
                .then((org) => {
                    setOrganization(org);
                })
                .catch(() => {
                    toast({
                        title: t('organization.details.loadError'),
                        variant: 'error',
                    });
                });
        }
    }, [organization, setOrganization, t, toast]);

    const slug = organization?.slug;
    // The backend calls a hopps user linked to an organization a "Member" — these are not club members.
    const { data: users = [], isLoading: usersLoading } = useQuery<Member[]>({
        queryKey: ['organization', slug, 'members'],
        queryFn: () => apiService.orgService.members(slug!),
        enabled: !!slug,
    });

    const onSubmit = useCallback(
        async (data: FormValues) => {
            try {
                // The staged logo goes up first, so the field update below returns the organization with hasLogo set.
                if (pendingLogo) {
                    try {
                        await apiService.orgService.logoPOST({ data: pendingLogo, fileName: pendingLogo.name });
                        setPendingLogo(null);
                        setLogoVersion((current) => current + 1);
                    } catch (error) {
                        console.error('Failed to upload organization logo:', error);
                        const status = (error as { status?: number } | undefined)?.status;
                        const messageKey =
                            status === 415
                                ? 'logo.errorType'
                                : status === 413
                                  ? 'logo.errorTooLarge'
                                  : status === 400
                                    ? 'logo.errorTooSmall'
                                    : 'logo.errorGeneric';
                        toast({ title: t(`organization.details.${messageKey}`), variant: 'error' });
                        // Keep the staged file and the entered values so the user can correct and retry.
                        return;
                    }
                }

                const address = new Address();
                address.street = data.street || undefined;
                address.number = data.number || undefined;
                address.city = data.city || undefined;
                address.plz = data.plz || undefined;
                address.additionalLine = data.additionalLine || undefined;

                const input = new OrganizationInput();
                input.name = data.name;
                input.type = data.type as OrganizationType;
                input.website = data.website || undefined;
                input.address = address;
                input.foundingDate = data.foundingDate ? new Date(germanToIso(data.foundingDate)) : undefined;
                input.registrationCourt = data.registrationCourt || undefined;
                input.registrationNumber = data.registrationNumber || undefined;
                input.country = data.country || undefined;
                input.taxNumber = data.taxNumber || undefined;
                input.email = data.email || undefined;
                input.phoneNumber = data.phoneNumber || undefined;

                const updatedOrg = await apiService.orgService.myPUT(input);
                setOrganization(updatedOrg);
                reset(data);

                toast({
                    title: t('organization.details.saveSuccess'),
                    variant: 'success',
                });
            } catch (error) {
                console.error('Failed to save organization details:', error);
                toast({
                    title: t('organization.details.saveError'),
                    variant: 'error',
                });
            }
        },
        [pendingLogo, setOrganization, reset, t, toast]
    );

    if (!organization) {
        return <LoadingOverlay />;
    }

    return (
        <>
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col min-h-full" style={{ fontFamily: FONT }}>
                {/* Sticky page header — the save action only appears once something changed */}
                <header className="sticky top-0 z-10 -mx-4 sm:-mx-7 mb-[18px] px-4 sm:px-7 pt-1 pb-[18px] border-b border-[#E9E9EE] bg-[#F3F4F6]/85 backdrop-blur-[10px]">
                    <div className="mx-auto w-full max-w-[940px] flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <h1 className="text-[27px] font-extrabold tracking-[-0.02em] leading-tight text-[#1B1B1F]">{t('organization.details.title')}</h1>
                            <p className="mt-[5px] text-[14.5px] text-[#6B6B76]">{t('organization.details.description')}</p>
                        </div>

                        {hasChanges && (
                            <div className="ml-auto flex items-center gap-2.5 pt-1">
                                {/* The counter is the first thing to go when the row gets tight. */}
                                <span className="hidden lg:flex items-center gap-2 text-[13.5px] font-bold text-[#B47C18] whitespace-nowrap">
                                    <Info size={16} />
                                    {t('organization.details.unsavedChanges', { count: dirtyCount })}
                                </span>
                                <button
                                    type="button"
                                    onClick={discardChanges}
                                    disabled={isSubmitting}
                                    className="inline-flex items-center gap-2 rounded-full px-4 py-[9px] text-[13.5px] font-bold text-[#6B6B76] hover:bg-[#F1F1F4] hover:text-[#1B1B1F] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Undo2 size={15} />
                                    {t('organization.details.discard')}
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="inline-flex items-center gap-2 rounded-full bg-[#9955CC] px-5 py-[10px] text-[14px] font-bold text-white shadow-[0_1px_2px_rgba(120,60,180,0.25)] hover:bg-[#7E3FB4] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Check size={16} />
                                    {isSubmitting ? t('common.loading') : t('organization.details.saveChanges')}
                                </button>
                            </div>
                        )}
                    </div>
                </header>

                <div className="mx-auto w-full max-w-[940px] flex flex-col gap-[18px] pb-8">
                    <LogoCard pendingFile={pendingLogo} onFileSelected={handleLogoSelected} version={logoVersion} disabled={isSubmitting} />

                    {/* Placeholders use the design system's quiet ink (--ink-3) instead of the app-wide, much darker --muted. */}
                    <fieldset disabled={isSubmitting} className="min-w-0 flex flex-col gap-[18px] [&_input::placeholder]:text-[#9A9AA3]">
                        {/* Name & address */}
                        <SectionCard icon={<Building2 size={19} aria-hidden="true" />} title={t('organization.details.generalInfo')}>
                            <FieldGrid>
                                <GridField span={4}>
                                    <TextField
                                        label={t('organization.details.name')}
                                        placeholder={t('organization.details.placeholder.name')}
                                        error={errors.name?.message}
                                        required
                                        {...register('name')}
                                    />
                                </GridField>
                                <GridField span={2}>
                                    <Controller
                                        name="type"
                                        control={control}
                                        render={({ field }) => (
                                            <Select
                                                label={t('organization.details.type')}
                                                items={typeOptions}
                                                value={field.value}
                                                onValueChanged={field.onChange}
                                                error={errors.type?.message}
                                                required
                                            />
                                        )}
                                    />
                                </GridField>
                                <GridField span={3}>
                                    <TextField
                                        label={t('organization.details.street')}
                                        placeholder={t('organization.details.placeholder.street')}
                                        {...register('street')}
                                    />
                                </GridField>
                                <GridField span={1}>
                                    <TextField
                                        label={t('organization.details.number')}
                                        placeholder={t('organization.details.placeholder.number')}
                                        {...register('number')}
                                    />
                                </GridField>
                                <GridField span={1}>
                                    <TextField
                                        label={t('organization.details.plz')}
                                        placeholder={t('organization.details.placeholder.plz')}
                                        {...register('plz')}
                                    />
                                </GridField>
                                <GridField span={1}>
                                    <TextField
                                        label={t('organization.details.city')}
                                        placeholder={t('organization.details.placeholder.city')}
                                        {...register('city')}
                                    />
                                </GridField>
                                <GridField span={2}>
                                    <Controller
                                        name="country"
                                        control={control}
                                        render={({ field }) => (
                                            <Select
                                                label={t('organization.details.country')}
                                                items={countryOptions}
                                                value={field.value}
                                                onValueChanged={field.onChange}
                                            />
                                        )}
                                    />
                                </GridField>
                                <GridField span={4}>
                                    <TextField
                                        label={t('organization.details.additionalLine')}
                                        placeholder={t('organization.details.placeholder.additionalLine')}
                                        {...register('additionalLine')}
                                    />
                                </GridField>
                            </FieldGrid>
                        </SectionCard>

                        {/* Legal */}
                        <SectionCard icon={<Landmark size={19} aria-hidden="true" />} title={t('organization.details.legalInfo')}>
                            <FieldGrid>
                                <GridField span={2}>
                                    <TextField
                                        label={t('organization.details.foundingDate')}
                                        placeholder={t('organization.details.placeholder.foundingDate')}
                                        error={errors.foundingDate?.message}
                                        {...register('foundingDate')}
                                    />
                                </GridField>
                                <GridField span={2}>
                                    <TextField
                                        label={t('organization.details.registrationNumber')}
                                        placeholder={t('organization.details.placeholder.registrationNumber')}
                                        {...register('registrationNumber')}
                                    />
                                </GridField>
                                <GridField span={2}>
                                    <TextField
                                        label={t('organization.details.registrationCourt')}
                                        placeholder={t('organization.details.placeholder.registrationCourt')}
                                        {...register('registrationCourt')}
                                    />
                                </GridField>
                                <GridField span={3}>
                                    <TextField
                                        label={t('organization.details.taxNumber')}
                                        placeholder={t('organization.details.placeholder.taxNumber')}
                                        {...register('taxNumber')}
                                    />
                                </GridField>
                            </FieldGrid>
                        </SectionCard>

                        {/* Contact */}
                        <SectionCard icon={<Globe size={19} aria-hidden="true" />} title={t('organization.details.contactInfo')}>
                            <FieldGrid>
                                <GridField span={2}>
                                    <TextField
                                        label={t('organization.details.website')}
                                        placeholder={t('organization.details.placeholder.website')}
                                        {...register('website')}
                                    />
                                </GridField>
                                <GridField span={2}>
                                    <TextField
                                        label={t('organization.details.email')}
                                        placeholder={t('organization.details.placeholder.email')}
                                        {...register('email')}
                                    />
                                </GridField>
                                <GridField span={2} hint={t('organization.details.phoneNumberHint')}>
                                    <TextField
                                        label={t('organization.details.phoneNumber')}
                                        placeholder={t('organization.details.placeholder.phoneNumber')}
                                        {...register('phoneNumber')}
                                    />
                                </GridField>
                            </FieldGrid>
                        </SectionCard>

                        {/* Users */}
                        <SectionCard
                            icon={<Users size={19} aria-hidden="true" />}
                            title={t('organization.details.users.title')}
                            action={
                                <button
                                    type="button"
                                    onClick={() => setAddUserOpen(true)}
                                    className="inline-flex flex-shrink-0 items-center gap-2 rounded-full bg-[#ECE0F6] px-4 py-2 text-[13.5px] font-bold text-[#7E3FB4] transition-colors hover:bg-[#F3EAFB]"
                                >
                                    <UserPlus size={15} aria-hidden="true" />
                                    {t('organization.details.users.add.button')}
                                </button>
                            }
                        >
                            {usersLoading ? (
                                <div className="py-6">
                                    <LoadingState />
                                </div>
                            ) : users.length === 0 ? (
                                <p className="py-4 text-[13.5px] text-[#9A9AA3]">{t('organization.details.users.empty')}</p>
                            ) : (
                                <div>
                                    <div className={`${USER_ROW_GRID} px-1 pb-2 text-[12px] font-bold uppercase tracking-[0.04em] text-[#6B6B76]`}>
                                        <span>{t('organization.details.users.name')}</span>
                                        <span>{t('organization.details.users.position')}</span>
                                        <span>{t('organization.details.users.email')}</span>
                                    </div>
                                    {users.map((user) => {
                                        const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email;
                                        // The backend does not carry a position per member yet — see issue #751.
                                        const position = typeof user.position === 'string' ? user.position.trim() : '';
                                        return (
                                            <div
                                                key={user.id ?? user.email}
                                                className={`${USER_ROW_GRID} items-center px-1 py-[11px] border-t border-[#E9E9EE]`}
                                            >
                                                <span className="flex items-center gap-2.5 text-[14.5px] font-bold text-[#1B1B1F] min-w-0">
                                                    <UserAvatar name={name} />
                                                    <span className="truncate">{name}</span>
                                                </span>
                                                <span className={`text-[14px] truncate ${position ? 'text-[#6B6B76]' : 'text-[#9A9AA3]'}`}>
                                                    {position || '–'}
                                                </span>
                                                <span className="text-[14px] text-[#6B6B76] truncate">{user.email}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </SectionCard>
                    </fieldset>
                </div>
            </form>

            {/* Outside the form on purpose: a portalled dialog still bubbles its submit up the React tree. */}
            <AddUserDialog open={addUserOpen} onClose={() => setAddUserOpen(false)} onSubmit={handleAddUser} />
        </>
    );
}

export default OrganizationDetailsSettingsView;
