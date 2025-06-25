import SettingsPageHeader from '@/components/SettingsPage/SettingsPageHeader.tsx';
import { useToast } from '@/hooks/use-toast.ts';
import TextField from '@/components/ui/TextField.tsx';
import Select from '@/components/ui/Select.tsx';
import Button from '@/components/ui/Button.tsx';
import DatePicker from '@/components/ui/DatePicker.tsx';
import { useTranslation } from 'react-i18next';
import { useOrganizationForm } from '@/components/OrganizationDetailsForm/useOrganizationForm.ts';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay.tsx';
import { format } from 'date-fns';

function OrganizationDetailsSettingsView() {
     const {
        register,
        handleSubmit,
        formState: { errors },
        watchCountry,
        watchDateOfFoundation,
        setValue,
        countryOptions,
        isLoading,
    } = useOrganizationForm();

    
    const { t } = useTranslation();
    const { showError, showSuccess } = useToast();  

    async function onSubmit(data: any) {
        console.log('Saving date:', data.dateOfFoundation);
        try {
            const formattedData = {
            ...data,
            dateOfFoundation: data.dateOfFoundation ? format(data.dateOfFoundation, 'yyyy-MM-dd') : undefined, // Actual type of date?
        }
    
        console.log('Submitted data:', formattedData);
        showSuccess('Saved successfully');
        } catch (error) {
            console.error('Error saving organization data:', error);
            showError('Failed to save organization data');
        }
    }

    return (
        <>  
            <LoadingOverlay isEnabled={isLoading} />
            <SettingsPageHeader />
            <form onSubmit={handleSubmit(onSubmit)}>
                <div className="mt-4 mb-10">
                    <h2 className="mb-6">{ t('organizationDetails.headings.generalInfo') }</h2>
                    <div className="grid grid-cols-2 gap-6">
                        <div className="flex flex-col gap-6">
                            <TextField label={t('organizationDetails.form.organizationName.label')} {...register('organizationName')} error={errors.organizationName?.message} required />
                            <TextField label={t('organizationDetails.form.street.label')} {...register('street')} error={errors.street?.message}/>
                            <div className="flex">
                                <TextField label={t('organizationDetails.form.postalCode.label')} {...register('postalCode')} error={errors.postalCode?.message} className="w-40"/>
                                <TextField label={t('organizationDetails.form.city.label')} {...register('city')} error={errors.city?.message} className="w-64"/>
                            </div>
                            <Select 
                                label={t('organizationDetails.form.country.label')}
                                items={countryOptions}  
                                placeholder="Please select"
                                error={errors.country?.message}
                                value={watchCountry}
                                onValueChanged={(value) => 
                                    setValue('country', value, {
                                        shouldValidate: true,
                                        shouldDirty: true,
                                    })
                                }
                            />
                        </div>
                        <div className="flex flex-col gap-6">
                             <DatePicker 
                                label={t('organizationDetails.form.dateOfFoundation.label')} 
                                value={watchDateOfFoundation}
                                placeholder="dd.mm.yyyy"
                                onChange={(value) => {
                                    console.log('Selected date:', value);
                                    setValue('dateOfFoundation', value, {
                                        shouldValidate: true,
                                        shouldDirty: true,
                                        }
                                    );
                                }}
                            />
                            <TextField label={t('organizationDetails.form.registrationCourt.label')} {...register('registrationCourt')} error={errors.registrationCourt?.message} />
                            <TextField label={t('organizationDetails.form.registrationNumber.label')} {...register('registrationNumber')} error={errors.registrationNumber?.message} placeholder="HRA 12345"/>
                            <TextField label={t('organizationDetails.form.taxId.label')} {...register('taxId')} error={errors.taxId?.message} placeholder="3012034567890" />
                        </div>
                    </div>
                </div>
                <div className="mt-4">
                    <h2 className='mb-6'>{t('organizationDetails.headings.contactInfo')}</h2>
                    <div className="grid grid-cols-2 gap-6">
                        <TextField label={t('organizationDetails.form.organizationEmail.label')} {...register('organizationEmail')} error={errors.organizationEmail?.message} placeholder={t('organizationDetails.form.organizationEmail.placeholder')} required/>
                        <TextField label={t('organizationDetails.form.phoneNumber.label')} {...register('phoneNumber')} error={errors.phoneNumber?.message} placeholder={t('organizationDetails.form.phoneNumber.placeholder')} />
                        <TextField label={t('organizationDetails.form.website.label')} {...register('website')} error={errors.website?.message} placeholder={t('organizationDetails.form.website.placeholder')}/>
                    </div>
                </div>
                <div className="mt-24 text-right">
                    <Button type="submit" className='w-32'>{t('common.save')}</Button>
                </div>
            </form>
        </>
    );
}

export default OrganizationDetailsSettingsView;