import type { AxiosInstance } from 'axios';
import { AxiosServiceOptions, createAxiosService } from '../AxiosService';
import { Bommel } from '../types/Bommel';


export class BommelService {
    private axiosInstance: AxiosInstance;

    constructor(options: AxiosServiceOptions) {
        this.axiosInstance = createAxiosService(options)
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

    async createRootBommel(data: Partial<Bommel> & { organizationId: number }): Promise<Bommel> {
        const response = await this.axiosInstance.post<Bommel>('/bommel/root', data);
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

    async getRootBommel(organisationId: number): Promise<Bommel> {
        const response = await this.axiosInstance.get<Bommel>(`/bommel/root/${organisationId}`);
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
