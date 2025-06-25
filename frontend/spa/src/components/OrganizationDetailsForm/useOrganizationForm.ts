import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { useEffect, useMemo, useState } from 'react';
import apiService from '@/services/ApiService.ts';
import { getCountryOptions } from '@/lib/countryOptions';
import languageService from '@/services/LanguageService.ts';

export function useOrganizationForm() {
    const { t } = useTranslation();
    const [isLoading, setIsLoading] = useState(true);

    const schema = useMemo(() =>  
        z.object({
            organizationName: z.string().min(1, t('validation.required')),
            street: z.string().optional(),
            postalCode: z.string().regex(/^\d+$/, t('validation.valid')).optional().or(z.literal('')),
            city: z.string().optional(),
            country: z.string().optional(),
            dateOfFoundation: z.date().optional(),
            registrationCourt: z.string().optional(),
            registrationNumber: z.string().optional(),
            taxId: z.string().optional(),
            organizationEmail: z.string().min(1, t('validation.required')).email(t('validation.valid')),
            phoneNumber: z.string().optional().or(z.literal('')),
            website: z.string().url(t('validation.valid')).or(z.literal('')).optional(),
    }), [t]);

    type FormFields = z.infer<typeof schema>;

    const form = useForm<FormFields>({
        mode: 'onBlur',
        resolver: zodResolver(schema),
    });

    const { reset, watch } = form;

    const [currentLanguage] = useState(languageService.getLanguage());
    const countryOptions = getCountryOptions(currentLanguage);

    useEffect(() => {
        async function fetchData() {
            try {
                const org = await apiService.organization.getCurrentOrganization();

                if (!org) throw new Error('Organization not found');
                setIsLoading(false);

                const parsedDate = org.dateOfFoundation ? new Date(org.dateOfFoundation) : undefined;

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
            } catch (e) {
                console.error('Failed to load organization data:', e);
            }
        }

        fetchData();
    }, [reset]);

    return {
        ...form,
        watchCountry: watch('country'),
        watchDateOfFoundation: watch('dateOfFoundation'),
        countryOptions,
        isLoading,
    };
}
