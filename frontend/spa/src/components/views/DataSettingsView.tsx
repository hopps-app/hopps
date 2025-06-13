import SettingsPageHeader from '@/components/SettingsPage/SettingsPageHeader.tsx';
import { useToast } from '@/hooks/use-toast.ts';
import { zodResolver } from '@hookform/resolvers/zod';
// 1. Import Controller
import { useForm, Controller } from 'react-hook-form';
import TextField from '@/components/ui/TextField.tsx';
import Select from '@/components/ui/Select.tsx';
import Button from '@/components/ui/Button.tsx';
import DatePicker from '@/components/ui/DatePicker.tsx';
import { date, z } from 'zod';
import { useTranslation } from 'react-i18next';
import apiService from '@/services/ApiService.ts';
import languageService from '@/services/LanguageService.ts';
import { useEffect, useState } from 'react';
import { getCountryOptions } from '@/lib/countryOptions';

function DataSettingsView() {
    const { t } = useTranslation();
    const { showError, showSuccess } = useToast();
    const [currentLanguage] = useState(languageService.getLanguage());
    const countryOptions = getCountryOptions(currentLanguage);

    const schema = z.object({
        organizationName: z.string().min(1, 'This is field is required.'),
        street: z.string().optional(),
        postalCode: z.string().regex(/^\d+$/, 'Please enter a valid value.').optional().or(z.literal('')),
        city: z.string().optional(),
        country: z.string().optional(),
        dateOfFoundation: z.date().optional(),
        registrationCourt: z.string().optional(),
        registrationNumber: z.string().optional(),
        taxId: z.string().optional(),
        organizationEmail: z.string().min(1, 'This is field is required.').email('Invalid email address'),
        phoneNumber: z.string().optional().or(z.literal('')),
        website: z.string().url('Please enter a valid value.').or(z.literal('')).optional(),
    });

    type FormFields = z.infer<typeof schema>;
    
    const {setValue, register, handleSubmit, watch, formState, reset} = useForm<FormFields>({
        mode: 'onBlur',
        resolver: zodResolver(schema),
    });

    const watchCountry = watch('country');
    const watchDateOfFoundation = watch('dateOfFoundation');

    const { errors } = formState;

    useEffect(() => {
        // Testing if the org service  
        const fetchData = async () => {
            try {
                const org = await apiService.organization.getCurrentOrganization();

                const parsedDate = !org.dateOfFoundation ? new Date('10-10-1999') : undefined;
                reset({
                    organizationName: org.name,
                    street: org.address?.street ?? '',
                    postalCode: org.address?.postalCode ?? '',
                    city: org.address?.city ?? '',
                    country: org.address?.country ?? 'DE',
                    dateOfFoundation: parsedDate,
                    registrationCourt: org.registrationCourt ?? '',
                    registrationNumber: org.registrationNumber ?? '',
                    taxId: org.taxId ?? '',
                    organizationEmail: org.email ?? '',
                    phoneNumber: org.phoneNumber ?? '',
                    website: org.website ?? '',
                });
            } catch (error) {
                console.error('Failed to load organization data:', error);
            }
        };

        fetchData();
    }, []);

    async function onSubmit(data: FormFields) {
        const formattedData = {
            ...data,
            dateOfFoundation: data.dateOfFoundation ? data.dateOfFoundation.toISOString() : undefined, // Actual type of date?
        }
    
        console.log('Submitted data:', formattedData);
        showSuccess('Saved successfully');
    }

    return (
        <>  
            <SettingsPageHeader />
            <form onSubmit={handleSubmit(onSubmit)}>
                <div className="mt-4 mb-10">
                    <h2 className="mb-6">General Info</h2>
                    <div className="grid grid-cols-2 gap-6">
                        <div className="flex flex-col gap-6">
                            <TextField label="Organization Name" {...register('organizationName')} error={errors.organizationName?.message} />
                            <TextField label="Street" {...register('street')} error={errors.street?.message}/>
                            <div className="flex gap-6">
                                <TextField label="Postal Code" {...register('postalCode')} error={errors.postalCode?.message}/>
                                <TextField label="City" {...register('city')} error={errors.city?.message} />
                            </div>
                            <Select 
                                label="Country"
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
                                label="Date of Foundation" 
                                value={watchDateOfFoundation}
                                onChange={(value) => {
                                    setValue('dateOfFoundation', value, {
                                        shouldValidate: true,
                                        shouldDirty: true,
                                        }
                                    );
                                }}
                            />
                            <TextField label="Registration Court" {...register('registrationCourt')} error={errors.registrationCourt?.message} />
                            <TextField label="Registration Number" {...register('registrationNumber')} error={errors.registrationNumber?.message} placeholder="HRA 12345"/>
                            <TextField label="Tax ID" {...register('taxId')} error={errors.taxId?.message} placeholder="3012034567890" />
                        </div>
                    </div>
                </div>
                <div className="mt-4">
                    <h2 className='mb-6'>Contact Details</h2>
                    <div className="grid grid-cols-2 gap-6">
                        <TextField label="Organization email" {...register('organizationEmail')} error={errors.organizationEmail?.message} placeholder="contact@organization.com"/>
                        <TextField label="Phone number" {...register('phoneNumber')} error={errors.phoneNumber?.message} placeholder="+49 123456789"/>
                        <TextField label="Website" {...register('website')} error={errors.website?.message} placeholder="wwww.yourorganization.com"/>
                    </div>
                </div>
                <div className="mt-24 text-right">
                    <Button type="submit" className='w-32'>{t('common.save')}</Button>
                </div>
            </form>
        </>
    );
}

export default DataSettingsView;