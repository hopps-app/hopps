import {
    Bommel_ResourceClient,
    Document_ResourceClient,
    Organization_ResourceClient,
    Transaction_Record_ResourceClient,
} from './services/OrgService';
import { AuthenticatedHttpClient } from './AuthenticatedHttpClient';

export interface ApiServiceOptions {
    orgBaseUrl: string;
    getAccessToken?: () => string | undefined;
    refreshToken?: () => Promise<void>;
}

export class ApiService {
    private authenticatedHttpClient: AuthenticatedHttpClient;
    public bommel: Bommel_ResourceClient;
    public organization: Organization_ResourceClient;
    public document: Document_ResourceClient;
    public transactionRecord: Transaction_Record_ResourceClient;

    constructor(options: ApiServiceOptions) {
        const { orgBaseUrl, getAccessToken, refreshToken } = options;

        if (!orgBaseUrl || orgBaseUrl === '') {
            throw new Error('orgBaseUrl for hopps api service is missing.');
        }

        this.authenticatedHttpClient = new AuthenticatedHttpClient({ getAccessToken, refreshToken });
        this.bommel = new Bommel_ResourceClient(orgBaseUrl, this.authenticatedHttpClient);
        this.organization = new Organization_ResourceClient(orgBaseUrl, this.authenticatedHttpClient);
        this.document = new Document_ResourceClient(orgBaseUrl, this.authenticatedHttpClient);
        this.transactionRecord = new Transaction_Record_ResourceClient(orgBaseUrl, this.authenticatedHttpClient);
    }
}

export const createApiService = (options: ApiServiceOptions) => {
    return new ApiService(options);
};
