import type { OrganizationType } from '@hopps/api-client';
import { useTranslation } from 'react-i18next';

import Select from '@/components/ui/Select';
import TextField from '@/components/ui/TextField';
import { useCountries } from '@/hooks/use-countries';
import { currencyForCountry } from '@/lib/currency';
import { organizationTypeLabelKey, organizationTypesForCountry, type OrganizationFieldValues } from '@/lib/organizationTypes';

type Props = {
    value: OrganizationFieldValues;
    onChange: (value: OrganizationFieldValues) => void;
    errors?: Partial<Record<keyof OrganizationFieldValues, string>>;
};

/**
 * The organization part of creating an organization: name, optional contact email, country and legal form. The currency is not asked for; it
 * follows from the country (CHF for Switzerland and Liechtenstein, EUR otherwise) and is only shown. Used by the
 * registration and by a logged-in user who has no organization yet.
 */
export function OrganizationFields({ value, onChange, errors }: Props) {
    const { t } = useTranslation();
    const countryOptions = useCountries();
    const types = organizationTypesForCountry(value.country);
    const typeOptions = types.map((type) => ({ label: t(organizationTypeLabelKey(type)), value: type }));
    const currency = currencyForCountry(value.country);

    const changeCountry = (country: string) => {
        // The legal forms differ by country (an e.V. only exists in Germany): fall back to the most common one.
        const allowed = organizationTypesForCountry(country);
        onChange({ ...value, country, type: allowed.includes(value.type) ? value.type : allowed[0] });
    };

    return (
        <div className="flex flex-col gap-3">
            <TextField
                label={t('organization.registration.organizationName')}
                value={value.name}
                onValueChange={(name) => onChange({ ...value, name })}
                error={errors?.name}
                autoComplete="organization"
            />
            <TextField
                label={t('organization.registration.organizationEmail')}
                value={value.email}
                onValueChange={(email) => onChange({ ...value, email })}
                error={errors?.email}
                autoComplete="email"
            />
            <Select
                label={t('organization.registration.country')}
                items={countryOptions}
                value={value.country}
                onValueChanged={changeCountry}
                error={errors?.country}
                openDownwards
            />
            <Select
                label={t('organization.registration.legalForm')}
                items={typeOptions}
                value={value.type}
                onValueChanged={(type) => onChange({ ...value, type: type as OrganizationType })}
                error={errors?.type}
                openDownwards
            />
            <p className="text-xs text-muted-foreground">
                {t('organization.registration.currencyInfo', { currency: t(`organization.details.currency${currency}`) })}
            </p>
        </div>
    );
}
