import { Bommel } from '@/services/api/types/Bommel.ts';

export class BommelService {
    constructor(private baseUrl: string) {}

    async getBommel(id: string) {
        const response = await fetch(`${this.baseUrl}/bommel/${id}`, {
            method: 'GET',
        });
        return (await response.json()) as Promise<Bommel>;
    }

    async deleteBommel(id: string) {
        await fetch(`${this.baseUrl}/bommel/${id}`, { method: 'DELETE' });
    }

    async createBommel(data: Bommel) {
        const response = await fetch(`${this.baseUrl}/bommel`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        return response.json();
    }

    async createRootBommel(data: Bommel) {
        const response = await fetch(`${this.baseUrl}/bommel/root`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });
        return response.json();
    }

    async getBommelChildren(id: string) {
        const response = await fetch(`${this.baseUrl}/bommel/${id}/children`, {
            method: 'GET',
        });
        return response.json();
    }

    async getBommelChildrenRecursive(id: string) {
        const response = await fetch(`${this.baseUrl}/bommel/${id}/children/recursive`, {
            method: 'GET',
        });
        return response.json();
    }

    async getRootBommel() {
        const response = await fetch(`${this.baseUrl}/bommel/root`, {
            method: 'GET',
        });
        return response.json();
    }

    async updateBommel(id: string, data: Bommel) {
        const response = await fetch(`${this.baseUrl}/bommel/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });
        return response.json();
    }

    async moveBommel(id: string, newParentId: string) {
        const response = await fetch(`${this.baseUrl}/bommel/move/${id}/to/${newParentId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
        });
        return response.json() as Promise<Bommel>;
    }
}
