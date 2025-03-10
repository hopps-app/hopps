import { Bommel } from '@/services/api/types/Bommel';

export type BommelsState = {
    rootBommel: Bommel | null;
    allBommels: Bommel[];
    isLoading: boolean;
    isError: boolean;
};

export type BommelActions = {
    loadBommels: (organizationSlug: string) => Promise<void>;
    setLoading: (value: boolean) => void;
    reload: () => Promise<void>;
};
