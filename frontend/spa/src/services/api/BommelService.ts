import { Bommel } from '@/services/api/types/Bommel.ts';

export class BommelService {
    constructor(private baseUrl: string) {}

    async getBommel(id: number) {
        const response = await fetch(`${this.baseUrl}/bommel/${id}`, {
            method: 'GET',
        });
        return (await response.json()) as Promise<Bommel>;
    }

    async deleteBommel(id: number) {
        await fetch(`${this.baseUrl}/bommel/${id}?recursive=true`, { method: 'DELETE' });
    }

    async createBommel(data: Partial<Bommel>) {
        const response = await fetch(`${this.baseUrl}/bommel`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        return response.json();
    }

    async createRootBommel(data: Partial<Bommel> & { organizationId: number }): Promise<Bommel> {
        const response = await fetch(`${this.baseUrl}/bommel/root`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        return response.status === 200 || response.status === 201 ? response.json() : undefined;
    }

    async getBommelChildren(id: string) {
        const response = await fetch(`${this.baseUrl}/bommel/${id}/children`, {
            method: 'GET',
        });
        return response.json();
    }

    async getBommelChildrenRecursive(id: number): Promise<{ bommel: Bommel }[]> {
        const response = await fetch(`${this.baseUrl}/bommel/${id}/children/recursive`, { method: 'GET' });
        return response.json();
    }

    async getRootBommel(organisationId: number): Promise<Bommel> {
        const response = await fetch(`${this.baseUrl}/bommel/root/${organisationId}`, { method: 'GET' });
        return await response.json();
    }

    async updateBommel(id: number, data: Partial<Bommel>) {
        const response = await fetch(`${this.baseUrl}/bommel/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        return response.json();
    }

    async moveBommel(id: number, newParentId: number): Promise<Partial<Bommel>> {
        const response = await fetch(`${this.baseUrl}/bommel/move/${id}/to/${newParentId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
        });
        return await response.json();
    }
}
