import type { OrganizationType } from '@hopps/api-client';
import { z } from 'zod';

/** What is asked about a new organization; the currency follows from the country. */
export type OrganizationFieldValues = {
    name: string;
    country: string;
    type: OrganizationType;
    /** Contact address of the organization itself (optional), not the administrator's login. */
    email: string;
};

export const DEFAULT_ORGANIZATION_FIELDS: OrganizationFieldValues = { name: '', country: 'DE', type: 'EINGETRAGENER_VEREIN', email: '' };

/** Validation messages for the organization fields: the name is required, an email only checked when given. */
export function organizationFieldErrors(values: OrganizationFieldValues, t: (key: string) => string): Partial<Record<keyof OrganizationFieldValues, string>> {
    const errors: Partial<Record<keyof OrganizationFieldValues, string>> = {};
    if (!values.name.trim()) errors.name = t('validation.organizationNameRequired');
    if (values.email.trim() && !z.string().email().safeParse(values.email.trim()).success) errors.email = t('validation.email');
    return errors;
}

/** German legal forms; the e.V., gGmbH and gUG only exist under German law. */
const GERMAN_TYPES: OrganizationType[] = [
    'EINGETRAGENER_VEREIN',
    'GEMEINNUETZIGE_GMBH',
    'STIFTUNG',
    'GEMEINNUETZIGE_GENOSSENSCHAFT',
    'GEMEINNUETZIGE_UG',
    'ANDERE',
];

/** Legal forms offered for every other country (Swiss and Austrian Vereine are no e.V.). */
const OTHER_TYPES: OrganizationType[] = ['VEREIN', 'GEMEINNUETZIGE_GMBH', 'STIFTUNG', 'GEMEINNUETZIGE_GENOSSENSCHAFT', 'ANDERE'];

/** The legal forms that fit an organization in this country, the most common one first. */
export function organizationTypesForCountry(country: string | null | undefined): OrganizationType[] {
    return country?.toUpperCase() === 'DE' ? GERMAN_TYPES : OTHER_TYPES;
}

const LABEL_KEYS: Record<OrganizationType, string> = {
    EINGETRAGENER_VEREIN: 'organization.details.typeEV',
    GEMEINNUETZIGE_GMBH: 'organization.details.typeGGmbH',
    STIFTUNG: 'organization.details.typeStiftung',
    GEMEINNUETZIGE_GENOSSENSCHAFT: 'organization.details.typeEG',
    GEMEINNUETZIGE_UG: 'organization.details.typeGUG',
    VEREIN: 'organization.details.typeVerein',
    ANDERE: 'organization.details.typeAndere',
};

/** Translation key of the legal form's display name. */
export function organizationTypeLabelKey(type: OrganizationType): string {
    return LABEL_KEYS[type];
}
