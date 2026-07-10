import type { AdminOrganizationRow, AdminOrganizationsPage, OrganizationDetail } from './types';

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

/**
 * MOCK detail fields, keyed by org id. Kept separate from the list rows so the
 * list stays lean. A real `GET /organization/{id}` would return all of this in one shape.
 */
const MOCK_DETAILS: Record<number, Omit<OrganizationDetail, keyof AdminOrganizationRow>> = {
    1: {
        type: 'EINGETRAGENER_VEREIN',
        foundingDate: '2001-05-15',
        registrationCourt: 'Amtsgericht München',
        registrationNumber: 'VR 12345',
        taxNumber: '143/216/50123',
        country: 'DE',
        website: 'https://raketenfreunde.test',
        phoneNumber: '+49 89 1234567',
        members: [
            { id: 1, firstName: 'Kim', lastName: 'Rakete', email: 'kim.rakete@example.test' },
            { id: 2, firstName: 'Petra', lastName: 'Lang', email: 'petra.lang@example.test' },
            { id: 3, firstName: 'Markus', lastName: 'Reuter', email: 'markus.reuter@example.test' },
        ],
        address: { street: 'Raketenstraße', number: '42a', plz: '80331', city: 'München', additionalLine: null },
        bankImportCount: 9,
        tokenUsage: { total: 184320, services: { openai: 142000, azure: 42320 } },
    },
    2: {
        type: 'EINGETRAGENER_VEREIN',
        foundingDate: '2019-09-01',
        registrationCourt: 'Amtsgericht Ingolstadt',
        registrationNumber: 'VR 6789',
        taxNumber: '201/118/40987',
        country: 'DE',
        website: null,
        phoneNumber: '+49 841 998877',
        members: [
            { id: 1, firstName: 'Sabine', lastName: 'Vorstand', email: 'vorstand@stadtgarten.test' },
            { id: 2, firstName: 'Jens', lastName: 'Höfer', email: 'jens.hoefer@stadtgarten.test' },
        ],
        address: { street: 'Gartenweg', number: '7', plz: '85049', city: 'Ingolstadt', additionalLine: 'Hinterhaus' },
        bankImportCount: 2,
        tokenUsage: { total: 12800, services: { openai: 12800 } },
    },
    3: {
        type: 'ANDERE',
        foundingDate: '2026-06-20',
        registrationCourt: null,
        registrationNumber: null,
        taxNumber: null,
        country: 'DE',
        website: null,
        phoneNumber: null,
        members: [
            { id: 1, firstName: 'Info', lastName: 'Tierschutz', email: 'info@tierschutz-paf.test' },
        ],
        address: { street: 'Tiergasse', number: '3', plz: '85276', city: 'Pfaffenhofen', additionalLine: null },
        bankImportCount: 0,
        tokenUsage: null,
    },
    4: {
        type: 'EINGETRAGENER_VEREIN',
        foundingDate: '1998-11-30',
        registrationCourt: 'Amtsgericht Augsburg',
        registrationNumber: 'VR 2211',
        taxNumber: '312/077/60543',
        country: 'DE',
        website: 'https://harmonie-musikverein.test',
        phoneNumber: '+49 821 445566',
        members: [
            { id: 1, firstName: 'Tobias', lastName: 'Wagner', email: 'tobias.wagner@harmonie.test' },
            { id: 2, firstName: 'Lena', lastName: 'Braun', email: 'lena.braun@harmonie.test' },
            { id: 3, firstName: 'Frank', lastName: 'Keller', email: 'frank.keller@harmonie.test' },
            { id: 4, firstName: 'Uwe', lastName: 'Schmidt', email: 'uwe.schmidt@harmonie.test' },
        ],
        address: { street: 'Notenplatz', number: '1', plz: '86150', city: 'Augsburg', additionalLine: null },
        bankImportCount: 5,
        tokenUsage: { total: 61440, services: { openai: 38000, azure: 23440 } },
    },
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchOrganizations(): Promise<AdminOrganizationsPage> {
    // Simulates latency so loading states are exercised during development.
    await delay(300);
    return { rows: [...MOCK_ROWS], total: MOCK_ROWS.length };
}

export async function fetchOrganization(id: number): Promise<OrganizationDetail | null> {
    await delay(200);
    const row = MOCK_ROWS.find((r) => r.id === id);
    const detail = MOCK_DETAILS[id];
    if (!row || !detail) return null;
    return { ...row, ...detail };
}

export async function deleteOrganization(id: number): Promise<void> {
    await delay(300);
    MOCK_ROWS = MOCK_ROWS.filter((r) => r.id !== id);
}
