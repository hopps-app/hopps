import { InvoicesService } from './services/InvoicesService';
import { OrganisationService } from './services/OrganisationService';
import { Bommel_ResourceClient } from './services/OrgService';
import { AuthenticatedHttpClient } from './AuthenticatedHttpClient';

export interface ApiServiceOptions {
    orgBaseUrl: string;
    finBaseUrl: string;
    getAccessToken?: () => string | undefined;
    refreshToken?: () => Promise<void>;
}

export class ApiService {
    private authenticatedHttpClient: AuthenticatedHttpClient;
    public invoices: InvoicesService;
    public organization: OrganisationService;
    public bommel: Bommel_ResourceClient;

    constructor(options: ApiServiceOptions) {
        const { orgBaseUrl, finBaseUrl, getAccessToken, refreshToken } = options;

        this.authenticatedHttpClient = new AuthenticatedHttpClient({ getAccessToken, refreshToken });
        this.bommel = new Bommel_ResourceClient(orgBaseUrl, this.authenticatedHttpClient);

        if (!finBaseUrl || orgBaseUrl === '') {
            throw new Error('baseUrl for hopps api service is missing.');
        }
        if (!orgBaseUrl || orgBaseUrl === '') {
            throw new Error('baseUrl for hopps api service is missing.');
        }

        // this.bommel = new BommelService({ baseURL: orgBaseUrl, getAccessToken: (getAccessToken ? getAccessToken :  () => ''), getRefreshToken: (getRefreshToken ? getRefreshToken :  () => '') });
        this.invoices = new InvoicesService({
            baseURL: finBaseUrl,
            getAccessToken: (getAccessToken ? getAccessToken : () => ''),
            getRefreshToken: () => '',
        });
        this.organization = new OrganisationService({
            baseURL: orgBaseUrl,
            getAccessToken: (getAccessToken ? getAccessToken : () => ''),
            getRefreshToken: () => '',
        });
        // }
    }
}

export const createApiService = (options: ApiServiceOptions) => {
    return new ApiService(options);
};
