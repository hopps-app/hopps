import { apiClient } from '@/services/apiClient';
import authService from '@/services/auth/auth.service';

/**
 * Where the member-facing SPA lives. Impersonation is pointless without somewhere to land, so this
 * falls back to the dev port rather than failing silently when the variable is unset.
 */
const SPA_URL = import.meta.env.VITE_SPA_URL ?? 'http://localhost:5173';

export type ImpersonationTarget = {
    keycloakId: string;
    displayName: string;
    email: string;
};

/**
 * Asks the backend whether this member may be impersonated, which is also what writes the audit record.
 * Returns the Keycloak user id needed for the second step.
 */
export async function authoriseImpersonation(organizationId: number, memberId: number): Promise<ImpersonationTarget> {
    const ticket = await apiClient.impersonate(organizationId, memberId);
    return {
        keycloakId: ticket.keycloakId ?? '',
        displayName: ticket.displayName ?? '',
        email: ticket.email ?? '',
    };
}

/**
 * Performs the impersonation and opens the SPA as that member.
 *
 * The Keycloak call has to happen here, in the browser, and cannot be moved to the backend: Keycloak's
 * impersonation endpoint answers by setting SSO cookies on whoever called it, so calling it server-side
 * would hand the impersonated session to the server instead of to the administrator. Hence
 * `credentials: 'include'` — the point of the request is the cookies that come back.
 *
 * The consequence, which the confirmation dialog states plainly, is that this REPLACES the administrator's
 * own Keycloak session in this browser. After it returns, this admin app is authenticated as the member and
 * will lose admin access on its next token refresh; getting back means logging out and in again.
 */
export async function impersonate(target: ImpersonationTarget): Promise<void> {
    const keycloakUrl = import.meta.env.VITE_KEYCLOAK_URL?.replace(/\/+$/, '');
    const realm = import.meta.env.VITE_KEYCLOAK_REALM;
    const token = authService.getAccessToken();

    if (!keycloakUrl || !realm) {
        throw new Error('Keycloak URL or realm is not configured');
    }
    if (!token) {
        throw new Error('No access token available');
    }

    const response = await fetch(`${keycloakUrl}/admin/realms/${realm}/users/${target.keycloakId}/impersonation`, {
        method: 'POST',
        credentials: 'include',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        // 403 here almost always means the admin realm role is missing the realm-management "impersonation"
        // client role, rather than anything being wrong with the request.
        throw new Error(`Keycloak refused the impersonation (${response.status})`);
    }

    // Opened rather than navigated to, so the admin keeps this tab and can see it is no longer authorised —
    // which is the honest reflection of what just happened to their session.
    window.open(SPA_URL, '_blank', 'noopener');
}
