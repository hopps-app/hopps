import axios, { AxiosInstance } from 'axios';
import { AxiosServiceOptions, createAxiosService } from '../AxiosService';

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
    private axiosInstance: AxiosInstance;

    constructor(options: AxiosServiceOptions) {
        this.axiosInstance = createAxiosService(options)
    }

    async registerOrganization(payload: RegisterOrganizationPayload): Promise<void> {
        await axios.post('/organization', payload);
    }

    async getCurrentOrganization() {
        const result = await this.axiosInstance.get('/organization/my');
        return result.data;
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
