import { User } from './User';


export type Bommel = {
    id: number;
    name: string;
    emoji: string;
    parent?: Partial<Bommel>;
    responsibleMember?: User;
    children: string[];
};
