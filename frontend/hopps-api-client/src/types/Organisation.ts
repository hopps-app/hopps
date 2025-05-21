import { Bommel } from './Bommel';


export type Organisation = {
    id: number;
    name: string;
    slug: string;
    address: string | null;
    rootBommel?: Bommel;
};
