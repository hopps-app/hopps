import axios, { AxiosInstance } from 'axios';

import authService from '@/services/auth/AuthService.ts';

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
        this.axiosInstance = axios.create({
            baseURL: this.baseUrl,
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authService.getAuthToken()}` },
        });
    }

    async registerOrganization(payload: RegisterOrganizationPayload): Promise<void> {
        const url = `${import.meta.env.VITE_ORGANIZATION_SERVICE_URL || this.baseUrl}/organization`;
        await axios.post(url, payload, { headers: { 'Content-Type': 'application/json' } });
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
