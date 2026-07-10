import type { AdminOrganizationRow, AdminOrganizationsPage } from './types';

/**
 * ⚠️ MOCK DATA — there is no list-organizations endpoint yet, and no delete endpoint.
 *
 * The org service exposes only `/organization/{slug}`, `/organization/my` and
 * `/statistics/organizations/{orgId}`. None of them return a collection, and there
 * is no `DELETE /organization`, so this feature runs entirely on fixtures.
 *
 * To make it real:
 *  - `fetchOrganizations` / `fetchOrganization` → call the generated api-client.
 *  - `deleteOrganization` → call a real `DELETE /organization/{id}` (must be
 *    `@RolesAllowed("admin")`). Real deletion cascades to members, Bommeln,
 *    transactions and documents — that is the whole reason the UI type-to-confirms.
 *
 * The eventual list/delete endpoints MUST be `@RolesAllowed("admin")`. Without it, any
 * authenticated member of any org could enumerate or delete organizations.
 * Note the backend authorizes on the `groups` claim, not `realm_access.roles`.
 *
 * `MOCK_ROWS` is mutable so a mock delete persists while navigating within the session.
 */
let MOCK_ROWS: AdminOrganizationRow[] = [
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
];

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchOrganizations(): Promise<AdminOrganizationsPage> {
    // Simulates latency so loading states are exercised during development.
    await delay(300);
    return { rows: [...MOCK_ROWS], total: MOCK_ROWS.length };
}

export async function fetchOrganization(id: number): Promise<AdminOrganizationRow | null> {
    await delay(200);
    return MOCK_ROWS.find((r) => r.id === id) ?? null;
}

export async function deleteOrganization(id: number): Promise<void> {
    await delay(300);
    MOCK_ROWS = MOCK_ROWS.filter((r) => r.id !== id);
}
