import { Network, Sheet, Tag, Upload } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { useSetupProgress } from './hooks';

import { useEnsureBommels } from '@/hooks/use-ensure-bommels';
import { useBommelsStore } from '@/store/bommels/bommelsStore';

export type SetupStep = { key: 'bommel' | 'categories' | 'receipt' | 'bankImport'; icon: LucideIcon; path: string; done: boolean };

/**
 * The four first-use steps with their done state, for the dashboard strip and the sidebar entry. `steps` is null until
 * everything is loaded, so nothing flashes up for an organization that is already set up.
 */
export function useSetupSteps(organizationId: number | undefined) {
    useEnsureBommels();
    const allBommels = useBommelsStore((s) => s.allBommels);
    const bommelsLoaded = useBommelsStore((s) => !s.isLoading && s.allBommels.length > 0);
    const { data: progress } = useSetupProgress(organizationId);

    if (!progress || !bommelsLoaded) {
        return { steps: null, doneCount: 0, total: 4, complete: false };
    }

    const steps: SetupStep[] = [
        // The root bommel always exists; the step is done once there is something below it. Opens straight in edit mode.
        { key: 'bommel', icon: Network, path: '/structure?edit=1', done: allBommels.length > 1 },
        { key: 'categories', icon: Tag, path: '/admin/categories', done: progress.categories },
        // Points to the upload area on the receipts page.
        { key: 'receipt', icon: Upload, path: '/receipts?upload=1', done: progress.receipt },
        { key: 'bankImport', icon: Sheet, path: '/bank-accounts', done: progress.bankImport },
    ];
    const doneCount = steps.filter((s) => s.done).length;
    return { steps, doneCount, total: steps.length, complete: doneCount === steps.length };
}
