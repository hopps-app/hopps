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
            country: '',
            taxNumber: '',
            email: '',
            phoneNumber: '',
        },
    });

    useUnsavedChangesWarning(isDirty);

    // Load organization data from store into form
    useEffect(() => {
        if (organization) {
            const foundingDate = organization.foundingDate;
            const dateStr = foundingDate
                ? isoToGerman(
                      `${foundingDate.getFullYear()}-${String(foundingDate.getMonth() + 1).padStart(2, '0')}-${String(foundingDate.getDate()).padStart(2, '0')}`
                  )
                : '';
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
                country: organization.country || '',
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
        <div>
            <p className="text-sm text-muted-foreground mt-1 mb-6">{t('organization.details.description')}</p>

            <form className="mt-4 max-w-[880px]" onSubmit={handleSubmit(onSubmit)}>
                <fieldset disabled={isSubmitting} className="space-y-8">
                    {/* Organization Name */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
                        <div className="sm:col-span-2">
                            <TextField
                                label={t('organization.details.name')}
                                placeholder={t('organization.details.name')}
                                error={errors.name?.message}
                                required
                                {...register('name')}
                            />
                        </div>
                    </div>

                    {/* Organization Type */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
                        <div className="sm:col-span-2">
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
                        </div>
                    </div>

                    {/* Legal Information Section */}
                    <fieldset className="space-y-4">
                        <legend className="text-lg font-semibold text-foreground">{t('organization.details.legalInfo')}</legend>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
                            <div className="sm:col-span-2">
                                <TextField
                                    label={t('organization.details.foundingDate')}
                                    type="text"
                                    placeholder="TT.MM.JJJJ"
                                    error={errors.foundingDate?.message}
                                    {...register('foundingDate')}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
                            <div className="sm:col-span-2">
                                <div className="grid grid-cols-2 gap-3">
                                    <TextField
                                        label={t('organization.details.registrationCourt')}
                                        placeholder={t('organization.details.registrationCourt')}
                                        {...register('registrationCourt')}
                                    />
                                    <TextField
                                        label={t('organization.details.registrationNumber')}
                                        placeholder={t('organization.details.registrationNumber')}
                                        {...register('registrationNumber')}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
                            <div className="sm:col-span-2">
                                <TextField
                                    label={t('organization.details.taxNumber')}
                                    placeholder={t('organization.details.taxNumber')}
                                    {...register('taxNumber')}
                                />
                            </div>
                        </div>
                    </fieldset>

                    {/* Address Section */}
                    <fieldset className="space-y-4">
                        <legend className="text-lg font-semibold text-foreground">{t('organization.details.address')}</legend>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
                            <div className="sm:col-span-2">
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="col-span-2">
                                        <TextField
                                            label={t('organization.details.street')}
                                            placeholder={t('organization.details.street')}
                                            {...register('street')}
                                        />
                                    </div>
                                    <div className="col-span-1">
                                        <TextField
                                            label={t('organization.details.number')}
                                            placeholder={t('organization.details.number')}
                                            {...register('number')}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
                            <div className="sm:col-span-2">
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="col-span-1">
                                        <TextField label={t('organization.details.plz')} placeholder={t('organization.details.plz')} {...register('plz')} />
                                    </div>
                                    <div className="col-span-2">
                                        <TextField label={t('organization.details.city')} placeholder={t('organization.details.city')} {...register('city')} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
                            <div className="sm:col-span-2">
                                <TextField label={t('organization.details.country')} placeholder={t('organization.details.country')} {...register('country')} />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
                            <div className="sm:col-span-2">
                                <TextField
                                    label={t('organization.details.additionalLine')}
                                    placeholder={t('organization.details.additionalLine')}
                                    {...register('additionalLine')}
                                />
                            </div>
                        </div>
                    </fieldset>

                    {/* Contact Information Section */}
                    <fieldset className="space-y-4">
                        <legend className="text-lg font-semibold text-foreground">{t('organization.details.contactInfo')}</legend>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
                            <div className="sm:col-span-2">
                                <TextField label={t('organization.details.website')} placeholder="https://example.com" {...register('website')} />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
                            <div className="sm:col-span-2">
                                <TextField label={t('organization.details.email')} placeholder={t('organization.details.email')} {...register('email')} />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
                            <div className="sm:col-span-2">
                                <TextField
                                    label={t('organization.details.phoneNumber')}
                                    placeholder={t('organization.details.phoneNumber')}
                                    {...register('phoneNumber')}
                                />
                            </div>
                        </div>
                    </fieldset>

                    {/* Save Button */}
                    <div className="flex justify-end">
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
