import type { Role } from '@hopps/api-client';
import type { TFunction } from 'i18next';

import type { SelectItem } from '@/components/ui/Select';

/** The roles that can be given, in the order they are offered. The auditor is hidden, so it is not among them. */
export const ASSIGNABLE_ROLES = ['OWNER', 'ADMIN', 'TREASURER', 'VIEWER'] as const satisfies readonly Role[];
export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

/**
 * The entries of a role select, each with a line saying what the role allows. Everyone sees the owner role, but only
 * owners may hand it out, so for anyone else it is greyed out with a lock. A member who already holds the hidden
 * auditor role keeps it in their own select (`current`), so the field does not show an empty value.
 */
export function roleSelectItems(t: TFunction, canManageOwners: boolean, current?: Role): SelectItem[] {
    const roles: Role[] = current === 'AUDITOR' ? [...ASSIGNABLE_ROLES, 'AUDITOR'] : [...ASSIGNABLE_ROLES];
    return roles.map((role) => {
        const ownerOnly = role === 'OWNER' && !canManageOwners;
        return {
            value: role,
            label: t(`organization.details.users.roles.${role}.name`),
            description: ownerOnly ? t('organization.details.users.roles.ownerOnly') : t(`organization.details.users.roles.${role}.description`),
            disabled: ownerOnly,
            locked: ownerOnly,
        };
    });
}
