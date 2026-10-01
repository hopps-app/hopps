import * as Tooltip from '@radix-ui/react-tooltip';
import { useTranslation } from 'react-i18next';

import { useSetupSteps } from '@/components/Dashboard/useSetupSteps';
import { useGuardedNavigate } from '@/hooks/use-unsaved-changes-warning';
import { useSetupStore } from '@/store/setup/setupStore';
import { useStore } from '@/store/store';

/** Small progress ring: the done share of the setup steps. */
function ProgressRing({ done, total }: { done: number; total: number }) {
    const radius = 8;
    const circumference = 2 * Math.PI * radius;
    return (
        <svg width="20" height="20" viewBox="0 0 20 20" className="-rotate-90" aria-hidden="true">
            <circle cx="10" cy="10" r={radius} fill="none" strokeWidth="2.5" className="stroke-purple-200" />
            <circle
                cx="10"
                cy="10"
                r={radius}
                fill="none"
                strokeWidth="2.5"
                strokeLinecap="round"
                className="stroke-primary transition-[stroke-dashoffset] duration-500"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - done / total)}
            />
        </svg>
    );
}

/**
 * Sidebar entry "Einrichtung 2/4" while first-use steps are open. It keeps the progress in reach from every page and
 * brings the dashboard setup strip back after it was hidden. Disappears once all steps are done.
 */
export function SetupNavItem({ collapsed, onNavigated }: { collapsed: boolean; /** E.g. closes the mobile drawer. */ onNavigated?: () => void }) {
    const { t } = useTranslation();
    const navigate = useGuardedNavigate();
    const organizationId = useStore((s) => s.organization?.id);
    const show = useSetupStore((s) => s.show);
    const { steps, doneCount, total, complete } = useSetupSteps(organizationId ?? undefined);

    if (organizationId == null || !steps || complete) {
        return null;
    }

    const label = t('menu.setup');
    const count = t('menu.setupCount', { done: doneCount, total });

    const button = (
        <button
            type="button"
            onClick={() => {
                show(organizationId);
                if (navigate('/dashboard')) onNavigated?.();
            }}
            aria-label={`${label} ${count}`}
            className={`w-full flex items-center gap-3 rounded-lg text-sm font-medium text-grey-900 dark:text-grey-800 transition-colors duration-150 hover:bg-hover-effect dark:hover:bg-purple-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ${collapsed ? 'justify-center p-2.5' : 'px-3 py-2'}`}
        >
            <span className="flex-shrink-0">
                <ProgressRing done={doneCount} total={total} />
            </span>
            {!collapsed && (
                <>
                    <span className="flex-1 text-left truncate">{label}</span>
                    <span className="text-xs font-bold tabular-nums text-primary">{count}</span>
                </>
            )}
        </button>
    );

    if (!collapsed) {
        return button;
    }
    return (
        <Tooltip.Root>
            <Tooltip.Trigger asChild>{button}</Tooltip.Trigger>
            <Tooltip.Portal>
                <Tooltip.Content
                    side="right"
                    sideOffset={8}
                    className="z-50 rounded-md bg-grey-black px-2.5 py-1.5 text-xs font-medium text-white shadow-lg animate-in fade-in-0 zoom-in-95"
                >
                    {label} {count}
                    <Tooltip.Arrow className="fill-grey-black" />
                </Tooltip.Content>
            </Tooltip.Portal>
        </Tooltip.Root>
    );
}
