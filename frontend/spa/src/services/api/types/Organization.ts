import { Bommel } from '@hopps/api-client';

export type Organization = {
    id: number;
    name: string;
    slug: string;
    address: string | null;
    rootBommel?: Bommel;
};
