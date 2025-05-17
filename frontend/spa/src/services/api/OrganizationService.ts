import axios, { AxiosInstance } from 'axios';

import axiosService from '@/services/AxiosService.ts';
import { OrganizationConfirmationPayload, RegisterOrganizationPayload } from '@/services/api/types/Organization';

export class OrganizationService {
    readonly axiosInstance: AxiosInstance;

    constructor(readonly baseUrl: string) {
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
            .replace(/[^a-z0-9\s-]/g, '')
            .trim()
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-');
    }

    async inviteOrganizationMember(email: string, slug: string) {
        const url = `${import.meta.env.VITE_ORGANIZATION_SERVICE_URL || this.baseUrl}/organization/${slug}/member`;
        await this.axiosInstance.post(url, { email });
    }

    async confirmOrganizationInvitation(inviteId: number, payload: OrganizationConfirmationPayload) {
        const url = `${import.meta.env.VITE_ORGANIZATION_SERVICE_URL || this.baseUrl}/organization/join/${inviteId}`;
        await this.axiosInstance.post(url, payload || undefined);
    }
}
