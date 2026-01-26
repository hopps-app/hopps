import { Client } from './services/OrgService';
import { StatisticsService } from './services/StatisticsService';
import { AuthenticatedHttpClient } from './AuthenticatedHttpClient';

export interface ApiServiceOptions {
    orgBaseUrl: string;
    getAccessToken?: () => string | undefined;
    refreshToken?: () => Promise<void>;
}

export class ApiService {
    private authenticatedHttpClient: AuthenticatedHttpClient;
    public orgService: Client;
    public statisticsService: StatisticsService;

    constructor(options: ApiServiceOptions) {
        const { orgBaseUrl, getAccessToken, refreshToken } = options;

        if (!orgBaseUrl || orgBaseUrl === '') {
            throw new Error('orgBaseUrl for hopps api service is missing.');
        }

        this.authenticatedHttpClient = new AuthenticatedHttpClient({ getAccessToken, refreshToken });
        this.orgService = new Client(orgBaseUrl, this.authenticatedHttpClient);
        this.statisticsService = new StatisticsService(orgBaseUrl, this.authenticatedHttpClient);
    }
}

export const createApiService = (options: ApiServiceOptions) => {
    return new ApiService(options);
};
