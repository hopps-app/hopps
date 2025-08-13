import { Client } from './services/OrgService';
import { AuthenticatedHttpClient } from './AuthenticatedHttpClient';

export interface ApiServiceOptions {
    orgBaseUrl: string;
    getAccessToken?: () => string | undefined;
    refreshToken?: () => Promise<void>;
}

export class ApiService {
    private authenticatedHttpClient: AuthenticatedHttpClient;
    public orgService: Client;

    constructor(options: ApiServiceOptions) {
        const { orgBaseUrl, getAccessToken, refreshToken } = options;

        if (!orgBaseUrl || orgBaseUrl === '') {
            throw new Error('orgBaseUrl for hopps api service is missing.');
        }

        this.authenticatedHttpClient = new AuthenticatedHttpClient({ getAccessToken, refreshToken });
        this.orgService = new Client(orgBaseUrl, this.authenticatedHttpClient);

    }
}

export const createApiService = (options: ApiServiceOptions) => {
    return new ApiService(options);
};
