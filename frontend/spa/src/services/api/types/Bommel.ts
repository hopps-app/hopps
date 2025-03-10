import { User } from '@/services/api/types/User.ts';
import { Organization } from "@/services/api/types/Organization.ts";

export type Bommel = {
    id: number;
    name: string;
    emoji: string;
    parent?: Partial<Bommel>;
    responsibleMember?: User;
    children: string[];
    organization?: Partial<Organization>
};
