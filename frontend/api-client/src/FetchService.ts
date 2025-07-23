import { AuthenticatedHttpClient } from './AuthenticatedHttpClient';

export interface FetchServiceOptions {
    baseURL: string;
    getAccessToken: () => string | undefined;
    getRefreshToken: () => string | undefined;
}

export interface FetchInstance {
    get: <T>(url: string, config?: RequestInit) => Promise<{ data: T }>;
    post: <T>(url: string, data?: any, config?: RequestInit) => Promise<{ data: T }>;
    patch: <T>(url: string, data?: any, config?: RequestInit) => Promise<{ data: T }>;
    put: <T>(url: string, data?: any, config?: RequestInit) => Promise<{ data: T }>;
    delete: <T>(url: string, config?: RequestInit) => Promise<{ data: T }>;
}

export const createFetchService = (options: FetchServiceOptions): FetchInstance => {
    const httpClient = new AuthenticatedHttpClient({
        getAccessToken: options.getAccessToken,
        refreshToken: async () => {
            // This is a placeholder for token refresh logic
            // In a real implementation, you would call options.getRefreshToken()
            // and handle the refresh logic
            return Promise.resolve();
        }
    });

    const baseURL = options.baseURL.endsWith('/') ? options.baseURL : `${options.baseURL}/`;

    const handleResponse = async <T>(response: Response): Promise<{ data: T }> => {
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            return { data };
        } else {
            const data = await response.text();
            return { data: data as unknown as T };
        }
    };

    return {
        get: async <T>(url: string, config?: RequestInit) => {
            const fullUrl = new URL(url.startsWith('/') ? url.substring(1) : url, baseURL).toString();
            const response = await httpClient.fetch(fullUrl, {
                method: 'GET',
                ...config
            });
            return handleResponse<T>(response);
        },
        post: async <T>(url: string, data?: any, config?: RequestInit) => {
            const fullUrl = new URL(url.startsWith('/') ? url.substring(1) : url, baseURL).toString();
            const body = data instanceof FormData ? data : JSON.stringify(data);
            const headers = data instanceof FormData
                ? config?.headers
                : { 'Content-Type': 'application/json', ...config?.headers };
            
            const response = await httpClient.fetch(fullUrl, {
                method: 'POST',
                body,
                ...config,
                headers
            });
            return handleResponse<T>(response);
        },
        patch: async <T>(url: string, data?: any, config?: RequestInit) => {
            const fullUrl = new URL(url.startsWith('/') ? url.substring(1) : url, baseURL).toString();
            const body = data ? JSON.stringify(data) : undefined;
            const response = await httpClient.fetch(fullUrl, {
                method: 'PATCH',
                body,
                ...config,
                headers: {
                    'Content-Type': 'application/json',
                    ...config?.headers
                }
            });
            return handleResponse<T>(response);
        },
        put: async <T>(url: string, data?: any, config?: RequestInit) => {
            const fullUrl = new URL(url.startsWith('/') ? url.substring(1) : url, baseURL).toString();
            const body = data ? JSON.stringify(data) : undefined;
            const response = await httpClient.fetch(fullUrl, {
                method: 'PUT',
                body,
                ...config,
                headers: {
                    'Content-Type': 'application/json',
                    ...config?.headers
                }
            });
            return handleResponse<T>(response);
        },
        delete: async <T>(url: string, config?: RequestInit) => {
            const fullUrl = new URL(url.startsWith('/') ? url.substring(1) : url, baseURL).toString();
            const response = await httpClient.fetch(fullUrl, {
                method: 'DELETE',
                ...config
            });
            return handleResponse<T>(response);
        }
    };
};

// For backward compatibility, export the old names as well
export type AxiosServiceOptions = FetchServiceOptions;
export const createAxiosService = createFetchService;