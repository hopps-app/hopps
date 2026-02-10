import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Address, Organization, OrganizationInput } from '@hopps/api-client';

import Header from '@/components/ui/Header';
import Button from '@/components/ui/Button';
import TextField from '@/components/ui/TextField';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import { useToast } from '@/hooks/use-toast';
import apiService from '@/services/ApiService';
import { useStore } from '@/store/store';

function OrganizationDetailsSettingsView() {
    const { t } = useTranslation();
    const { toast } = useToast();
    const organization = useStore((state) => state.organization);
    const setOrganization = useStore((state) => state.setOrganization);

    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Form fields
    const [name, setName] = useState('');
    const [website, setWebsite] = useState('');
    const [street, setStreet] = useState('');
    const [number, setNumber] = useState('');
    const [city, setCity] = useState('');
    const [plz, setPlz] = useState('');
    const [additionalLine, setAdditionalLine] = useState('');

    // Load organization data from store
    useEffect(() => {
        if (organization) {
            setName(organization.name || '');
            setWebsite(organization.website || '');
            setStreet(organization.address?.street || '');
            setNumber(organization.address?.number || '');
            setCity(organization.address?.city || '');
            setPlz(organization.address?.plz || '');
            setAdditionalLine(organization.address?.additionalLine || '');
        }
    }, [organization]);

    // Reload from API if no org data in store
    useEffect(() => {
        if (!organization) {
            setIsLoading(true);
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
                })
                .finally(() => {
                    setIsLoading(false);
                });
        }
    }, [organization, setOrganization, t, toast]);

    const handleSave = useCallback(async () => {
        setIsSaving(true);
        try {
            const address = new Address();
            address.street = street || undefined;
            address.number = number || undefined;
            address.city = city || undefined;
            address.plz = plz || undefined;
            address.additionalLine = additionalLine || undefined;

            const input = new OrganizationInput();
            input.name = name;
            input.type = organization?.type;
            input.website = website || undefined;
            input.address = address;

            const updatedOrg = await apiService.orgService.myPUT(input);
            setOrganization(updatedOrg);

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
        } finally {
            setIsSaving(false);
        }
    }, [name, website, street, number, city, plz, additionalLine, organization, setOrganization, t, toast]);

    if (isLoading) {
        return <LoadingOverlay />;
    }

    return (
        <div className="px-7 py-[2.5rem]">
            <Header title={t('organization.details.title')} icon="Backpack" />
            <p className="text-sm text-muted-foreground mt-1 mb-6">{t('organization.details.description')}</p>

            <form
                className="mt-4 max-w-[880px]"
                onSubmit={(e) => {
                    e.preventDefault();
                    handleSave();
                }}
            >
                <div className="space-y-8">
                    {/* Organization Name */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
                        <div className="sm:col-span-2">
                            <TextField
                                label={t('organization.details.name')}
                                value={name}
                                onValueChange={setName}
                                placeholder={t('organization.details.name')}
                            />
                        </div>
                    </div>

                    {/* Organization Type (read-only display) */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
                        <div className="sm:col-span-2">
                            <TextField label={t('organization.details.type')} value={organization?.type || ''} placeholder={t('organization.details.type')} />
                        </div>
                    </div>

                    {/* Website */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
                        <div className="sm:col-span-2">
                            <TextField
                                label={t('organization.details.website')}
                                value={website}
                                onValueChange={setWebsite}
                                placeholder="https://example.com"
                            />
                        </div>
                    </div>

                    {/* Address Section */}
                    <fieldset className="space-y-4">
                        <legend className="text-lg font-semibold text-foreground">{t('organization.details.address')}</legend>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
                            <div className="sm:col-span-2">
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="col-span-2">
                                        <TextField
                                            label={t('organization.details.street')}
                                            value={street}
                                            onValueChange={setStreet}
                                            placeholder={t('organization.details.street')}
                                        />
                                    </div>
                                    <div className="col-span-1">
                                        <TextField
                                            label={t('organization.details.number')}
                                            value={number}
                                            onValueChange={setNumber}
                                            placeholder={t('organization.details.number')}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
                            <div className="sm:col-span-2">
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="col-span-1">
                                        <TextField
                                            label={t('organization.details.plz')}
                                            value={plz}
                                            onValueChange={setPlz}
                                            placeholder={t('organization.details.plz')}
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <TextField
                                            label={t('organization.details.city')}
                                            value={city}
                                            onValueChange={setCity}
                                            placeholder={t('organization.details.city')}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
                            <div className="sm:col-span-2">
                                <TextField
                                    label={t('organization.details.additionalLine')}
                                    value={additionalLine}
                                    onValueChange={setAdditionalLine}
                                    placeholder={t('organization.details.additionalLine')}
                                />
                            </div>
                        </div>
                    </fieldset>

                    {/* Save Button */}
                    <div className="flex justify-end">
                        <Button type="submit" variant="default" disabled={isSaving}>
                            {isSaving ? t('common.loading') : t('common.save')}
                        </Button>
                    </div>
                </div>
            </form>
        </div>
    );
}

export default OrganizationDetailsSettingsView;
