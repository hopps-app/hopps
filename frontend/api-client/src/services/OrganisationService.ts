import { FetchInstance, FetchServiceOptions, createFetchService } from '../FetchService';
import { Organization } from './OrgService';

type RegisterOrganizationPayload = {
    owner: {
        firstName: string;
        lastName: string;
        email: string;
    };
    newPassword: string;
    organization: {
        profilePicture?: string;
        website?: string;
        address?: {
            number?: string;
            city?: string;
            additionalLine?: string;
            street?: string;
            plz?: string;
        };
        name: string;
        type: 'EINGETRAGENER_VEREIN';
        slug: string;
    };
};

export class OrganisationService {
    private fetchInstance: FetchInstance;

    constructor(options: FetchServiceOptions) {
        this.fetchInstance = createFetchService(options)
    }

    async registerOrganization(payload: RegisterOrganizationPayload): Promise<void> {
        await this.fetchInstance.post('/organization', payload);
    }

    async getCurrentOrganization() : Promise<Organization>{
        const result = await this.fetchInstance.get('/organization/my');
        return result.data as Organization;
    }

    createSlug(input: string): string {
        return input
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
            .trim()
            .replace(/\s+/g, '-') // Replace spaces with hyphens
            .replace(/-+/g, '-'); // Replace multiple hyphens with a single hyphen
    }
}
