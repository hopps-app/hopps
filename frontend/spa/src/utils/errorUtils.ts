import i18n from 'i18next';

/**
 * Checks if an error is a network error (no response from server).
 */
export function isNetworkError(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false;

    // Check for fetch/axios network errors
    if (error instanceof TypeError && error.message === 'Failed to fetch') return true;
    if (error instanceof TypeError && error.message.includes('Network request failed')) return true;

    // Check for errors with no response (server unreachable)
    if ('response' in error && error.response === undefined) return true;
    if ('status' in error && (error as { status: number }).status === 0) return true;

    // Check for ECONNREFUSED or similar
    if ('code' in error) {
        const code = (error as { code: string }).code;
        if (code === 'ECONNREFUSED' || code === 'ECONNABORTED' || code === 'ERR_NETWORK') return true;
    }

    return false;
}

/**
 * Gets the HTTP status code from an error, if available.
 */
export function getErrorStatus(error: unknown): number | null {
    if (!error || typeof error !== 'object') return null;

    // Check error.response.status (axios/fetch pattern)
    if ('response' in error && error.response && typeof error.response === 'object' && 'status' in error.response) {
        return (error.response as { status: number }).status;
    }

    // Check error.status directly
    if ('status' in error && typeof (error as { status: unknown }).status === 'number') {
        return (error as { status: number }).status;
    }

    return null;
}

/**
 * Extracts a user-friendly error message from an API error.
 * Uses i18n translation keys for proper localization.
 */
export function getUserFriendlyErrorMessage(error: unknown): string {
    const t = i18n.t.bind(i18n);

    // Network errors
    if (isNetworkError(error)) {
        return t('errors.api.networkError');
    }

    // HTTP status-based errors
    const status = getErrorStatus(error);
    if (status !== null) {
        switch (status) {
            case 400:
                return t('errors.api.badRequest');
            case 401:
                return t('errors.api.unauthorized');
            case 403:
                return t('errors.api.forbidden');
            case 404:
                return t('errors.api.notFound');
            case 409:
                return t('errors.api.conflict');
            case 408:
            case 504:
                return t('errors.api.timeout');
            default:
                if (status >= 500) {
                    return t('errors.api.serverError');
                }
        }
    }

    return t('errors.api.unknown');
}
