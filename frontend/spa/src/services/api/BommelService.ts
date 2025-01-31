import type { AxiosInstance } from 'axios';

import { Bommel } from '@/services/api/types/Bommel.ts';
import axiosService from '@/services/AxiosService.ts';

export class BommelService {
    private axiosInstance: AxiosInstance;

    constructor(private baseUrl: string) {
        this.axiosInstance = axiosService.create(this.baseUrl);
    }

    async getBommel(id: number): Promise<Bommel> {
        const response = await this.axiosInstance.get<Bommel>(`/bommel/${id}`);
        return response.data;
    }

    async deleteBommel(id: number): Promise<void> {
        await this.axiosInstance.delete(`/bommel/${id}?recursive=true`);
    }

    async createBommel(data: Partial<Bommel>): Promise<Bommel> {
        const response = await this.axiosInstance.post<Bommel>('/bommel', data);
        return response.data;
    }

    async getBommelChildren(id: string): Promise<Bommel[]> {
        const response = await this.axiosInstance.get<Bommel[]>(`/bommel/${id}/children`);
        return response.data;
    }

    async getBommelChildrenRecursive(id: number): Promise<{ bommel: Bommel }[]> {
        const response = await this.axiosInstance.get<{ bommel: Bommel }[]>(`/bommel/${id}/children/recursive`);
        return response.data;
    }

    async getRootBommel(slug: string): Promise<Bommel> {
        const response = await this.axiosInstance.get<Bommel>(`/bommel/root/${slug}`);
        return response.data;
    }

    async updateBommel(id: number, data: Partial<Bommel>): Promise<Bommel> {
        const response = await this.axiosInstance.put<Bommel>(`/bommel/${id}`, data);
        return response.data;
    }

    async moveBommel(id: number, newParentId: number): Promise<Partial<Bommel>> {
        const response = await this.axiosInstance.put<Partial<Bommel>>(`/bommel/move/${id}/to/${newParentId}`);
        return response.data;
    }
}
