import type { AdminOrganizationsPage } from './types';

/**
 * ⚠️ MOCK DATA — there is no list-organizations endpoint yet.
 *
 * The org service exposes only `/organization/{slug}`, `/organization/my` and
 * `/statistics/organizations/{orgId}`. None of them return a collection, so this
 * table currently renders fixtures.
 *
 * To make it real, replace the body of `fetchOrganizations` with a call to the generated
 * api-client and delete this array. Nothing else in the feature changes — that is
 * the point of `AdminOrganizationRow` being the contract rather than `Organization` from the
 * api-client.
 *
 * The eventual endpoint MUST be `@RolesAllowed("admin")`. Without it, any
 * authenticated member of any org could enumerate every organization in the system.
 * Note the backend authorizes on the `groups` claim, not `realm_access.roles`.
 */
const MOCK_ROWS: AdminOrganizationsPage = {
    total: 4,
    rows: [
        {
            id: 1,
            name: 'Raketenfreunde e.V.',
            slug: 'raketen-freunde',
            contactEmail: 'kim.rakete@example.test',
            belegeCount: 128,
            lastActivityAt: '2026-07-09T14:22:00Z',
            createdAt: '2024-03-01T09:00:00Z',
        },
        {
            id: 2,
            name: 'Stadtgarten Initiative',
            slug: 'stadtgarten-initiative',
            contactEmail: 'vorstand@stadtgarten.test',
            belegeCount: 12,
            lastActivityAt: '2026-04-02T08:15:00Z',
            createdAt: '2025-11-14T16:30:00Z',
        },
        {
            id: 3,
            name: 'Tierschutz Pfaffenhofen',
            slug: 'tierschutz-pfaffenhofen',
            contactEmail: 'info@tierschutz-paf.test',
            belegeCount: 0,
            // Never logged in — distinct from "logged in long ago".
            lastActivityAt: null,
            createdAt: '2026-06-28T11:05:00Z',
        },
        {
            id: 4,
            name: 'Musikverein Harmonie',
            slug: 'musikverein-harmonie',
            // No member attached yet.
            contactEmail: null,
            belegeCount: 47,
            lastActivityAt: '2026-07-10T06:40:00Z',
            createdAt: '2023-01-20T10:00:00Z',
        },
    ],
};

export async function fetchOrganizations(): Promise<AdminOrganizationsPage> {
    // Simulates latency so loading states are exercised during development.
    await new Promise((resolve) => setTimeout(resolve, 300));
    return MOCK_ROWS;
}
