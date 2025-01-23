import { Bommel } from '@/services/api/types/Bommel.ts';

export type Organization = {
    id: number;
    name: string;
    slug: string;
    address: string | null;
    rootBommel?: Bommel;
};
