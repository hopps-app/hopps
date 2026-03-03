import { zodResolver } from '@hookform/resolvers/zod';
import { Address, OrganizationInput, TYPE } from '@hopps/api-client';
import { useCallback, useEffect, useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import Button from '@/components/ui/Button';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import Select from '@/components/ui/Select';
import TextField from '@/components/ui/TextField';
import { useCountries } from '@/hooks/use-countries';
import { usePageTitle } from '@/hooks/use-page-title';
import { useToast } from '@/hooks/use-toast';
import { useUnsavedChangesWarning } from '@/hooks/use-unsaved-changes-warning';
import apiService from '@/services/ApiService';
import { useStore } from '@/store/store';

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

function OrganizationDetailsSettingsView() {
    const { t } = useTranslation();
    usePageTitle(t('organization.details.title'), 'Backpack');
    const { toast } = useToast();
    const organization = useStore((state) => state.organization);
    const countryOptions = useCountries();
    const setOrganization = useStore((state) => state.setOrganization);

    const typeOptions = useMemo(
        () => [
            { label: t('organization.details.typeEV'), value: 'EINGETRAGENER_VEREIN' },
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
        formState: { errors, isSubmitting, isDirty },
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

    useUnsavedChangesWarning(isDirty);

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

    console.log('OrganizationDetailsSettingsView render', { organization });

    const onSubmit = useCallback(
        async (data: FormValues) => {
            try {
                const address = new Address();
                address.street = data.street || undefined;
                address.number = data.number || undefined;
                address.city = data.city || undefined;
                address.plz = data.plz || undefined;
                address.additionalLine = data.additionalLine || undefined;

                const input = new OrganizationInput();
                input.name = data.name;
                input.type = data.type as TYPE;
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
        [setOrganization, reset, t, toast]
    );

    if (!organization) {
        return <LoadingOverlay />;
    }

    return (
        <div className="w-full h-full flex flex-col">
            <p className="text-sm text-muted-foreground mt-1">{t('organization.details.description')}</p>

            <form className="mt-4 flex-1 flex flex-col" onSubmit={handleSubmit(onSubmit)}>
                <fieldset disabled={isSubmitting} className="flex-1 flex flex-col">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                        {/* Allgemeine Informationen */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-foreground">{t('organization.details.generalInfo')}</h3>

                            <TextField
                                label={t('organization.details.name')}
                                placeholder={t('organization.details.placeholder.name')}
                                error={errors.name?.message}
                                required
                                {...register('name')}
                            />

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

                            <div className="grid grid-cols-4 gap-3">
                                <div className="col-span-3">
                                    <TextField
                                        label={t('organization.details.street')}
                                        placeholder={t('organization.details.placeholder.street')}
                                        {...register('street')}
                                    />
                                </div>
                                <div className="col-span-1">
                                    <TextField
                                        label={t('organization.details.number')}
                                        placeholder={t('organization.details.placeholder.number')}
                                        {...register('number')}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-4 gap-3">
                                <div className="col-span-1">
                                    <TextField
                                        label={t('organization.details.plz')}
                                        placeholder={t('organization.details.placeholder.plz')}
                                        {...register('plz')}
                                    />
                                </div>
                                <div className="col-span-3">
                                    <TextField
                                        label={t('organization.details.city')}
                                        placeholder={t('organization.details.placeholder.city')}
                                        {...register('city')}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-4 gap-3">
                                <div className="col-span-2">
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
                                </div>
                                <div className="col-span-2">
                                    <TextField label={t('organization.details.additionalLine')} {...register('additionalLine')} />
                                </div>
                            </div>
                        </div>

                        {/* Rechtliche Informationen */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-foreground">{t('organization.details.legalInfo')}</h3>

                            <TextField
                                label={t('organization.details.foundingDate')}
                                type="text"
                                placeholder={t('organization.details.placeholder.foundingDate')}
                                error={errors.foundingDate?.message}
                                {...register('foundingDate')}
                            />

                            <TextField
                                label={t('organization.details.registrationCourt')}
                                placeholder={t('organization.details.placeholder.registrationCourt')}
                                {...register('registrationCourt')}
                            />

                            <TextField
                                label={t('organization.details.registrationNumber')}
                                placeholder={t('organization.details.placeholder.registrationNumber')}
                                {...register('registrationNumber')}
                            />

                            <TextField
                                label={t('organization.details.taxNumber')}
                                placeholder={t('organization.details.placeholder.taxNumber')}
                                {...register('taxNumber')}
                            />
                        </div>

                        {/* Kontakt Informationen */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-foreground">{t('organization.details.contactInfo')}</h3>

                            <TextField
                                label={t('organization.details.website')}
                                placeholder={t('organization.details.placeholder.website')}
                                {...register('website')}
                            />

                            <TextField
                                label={t('organization.details.email')}
                                placeholder={t('organization.details.placeholder.email')}
                                {...register('email')}
                            />

                            <TextField
                                label={t('organization.details.phoneNumber')}
                                placeholder={t('organization.details.placeholder.phoneNumber')}
                                {...register('phoneNumber')}
                            />
                        </div>
                    </div>

                    {/* Save Button */}
                    <div className="flex justify-end mt-auto pt-8 mb-2">
                        <Button type="submit" variant="default" disabled={isSubmitting}>
                            {isSubmitting ? t('common.loading') : t('common.save')}
                        </Button>
                    </div>
                </fieldset>
            </form>
        </div>
    );
}

export default OrganizationDetailsSettingsView;
