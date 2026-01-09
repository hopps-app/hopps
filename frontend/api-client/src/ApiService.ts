import { Client } from './services/HoppsAppService';
import { AuthenticatedHttpClient } from './AuthenticatedHttpClient';

export interface ApiServiceOptions {
    hoppsAppBaseUrl: string;
    getAccessToken?: () => string | undefined;
    refreshToken?: () => Promise<void>;
}

export class ApiService {
    private authenticatedHttpClient: AuthenticatedHttpClient;
    public hoppsApp: Client;

    constructor(options: ApiServiceOptions) {
        const { hoppsAppBaseUrl, getAccessToken, refreshToken } = options;

        if (!hoppsAppBaseUrl || hoppsAppBaseUrl === '') {
            throw new Error('hoppsAppBaseUrl for hopps api service is missing.');
        }

        this.authenticatedHttpClient = new AuthenticatedHttpClient({ getAccessToken, refreshToken });
        this.hoppsApp = new Client(hoppsAppBaseUrl, this.authenticatedHttpClient);

    }
}

export const createApiService = (options: ApiServiceOptions) => {
    return new ApiService(options);
};
