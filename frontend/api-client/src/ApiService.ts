import { BommelService } from './services/BommelService';
import { InvoicesService } from './services/InvoicesService';
import { OrganisationService } from './services/OrganisationService';

export interface ApiServiceOptions {
    orgBaseUrl: string;
    finBaseUrl: string;
    getAccessToken?: () => string | Promise<string> | Promise<undefined>;
    getRefreshToken?: () => string | Promise<string>;
}

export class ApiService {
    public bommel: BommelService;
    public invoices: InvoicesService;
    public organization: OrganisationService;

    constructor(options: ApiServiceOptions) {
        const { orgBaseUrl, finBaseUrl, getAccessToken, getRefreshToken } = options;
        if (!finBaseUrl || orgBaseUrl === '') {
            throw new Error('baseUrl for hopps api service is missing.');
        }
        if (!orgBaseUrl || orgBaseUrl === '') {
            throw new Error('baseUrl for hopps api service is missing.');
        }

        this.bommel = new BommelService({ baseURL: orgBaseUrl, getAccessToken: (getAccessToken ? getAccessToken :  () => ''), getRefreshToken: (getRefreshToken ? getRefreshToken :  () => '') });
        this.invoices = new InvoicesService({ baseURL: finBaseUrl, getAccessToken: (getAccessToken ? getAccessToken :  () => ''), getRefreshToken: (getRefreshToken ? getRefreshToken :  () => '') });
        this.organization = new OrganisationService({ baseURL: orgBaseUrl, getAccessToken: (getAccessToken ? getAccessToken :  () => ''), getRefreshToken: (getRefreshToken ? getRefreshToken :  () => '') });
    }
}

export const createApiService = (options: ApiServiceOptions) => {
    return new ApiService(options);
};
