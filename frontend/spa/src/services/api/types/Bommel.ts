import { User } from '@/services/api/types/User.ts';

export type Bommel = {
    id: number;
    name: string;
    emoji: string;
    parent: number;
    responsibleMember?: User;
    children: string[];
};
