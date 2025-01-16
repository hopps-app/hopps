import axios, { AxiosInstance } from 'axios';

import axiosService from '@/services/AxiosService.ts';

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

export class OrganizationService {
    private axiosInstance: AxiosInstance;

    constructor(private baseUrl: string) {
        this.axiosInstance = axiosService.create(this.baseUrl);
    }

    async registerOrganization(payload: RegisterOrganizationPayload): Promise<void> {
        const url = `${import.meta.env.VITE_ORGANIZATION_SERVICE_URL || this.baseUrl}/organization`;
        await axios.post(url, payload);
    }

    async getCurrentOrganization() {
        const url = `${import.meta.env.VITE_ORGANIZATION_SERVICE_URL || this.baseUrl}/organization/my`;
        const result = await this.axiosInstance.get(url);

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
