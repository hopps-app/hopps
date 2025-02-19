import { Bommel } from '@/services/api/types/Bommel';

export type BommelsState = {
    rootBommel: Bommel | null;
    allBommels: Bommel[];
    isLoading: boolean;
    isError: boolean;
};

export type BommelActions = {
    loadBommels: (organizationId: number) => Promise<void>;
    setLoading: (value: boolean) => void;
    reload: () => Promise<void>;
};
