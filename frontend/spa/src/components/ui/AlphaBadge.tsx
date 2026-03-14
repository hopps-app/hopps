import * as Tooltip from '@radix-ui/react-tooltip';
import { useTranslation } from 'react-i18next';

import { isAlphaVersion } from '@/utils/featureFlags';

type AlphaBadgeProps = {
    collapsed?: boolean;
};

export default function AlphaBadge({ collapsed = false }: AlphaBadgeProps) {
    const { t } = useTranslation();

    if (!isAlphaVersion()) return null;

    const badge = collapsed ? (
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold dark:bg-amber-900 dark:text-amber-200">
            &alpha;
        </span>
    ) : (
        <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 dark:border-amber-700 dark:bg-amber-900/50 dark:text-amber-200">
            &alpha; {t('alpha.badge')}
        </span>
    );

    return (
        <Tooltip.Provider delayDuration={300}>
            <Tooltip.Root>
                <Tooltip.Trigger asChild>
                    <button type="button" className="cursor-default">
                        {badge}
                    </button>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                    <Tooltip.Content
                        side="bottom"
                        sideOffset={8}
                        className="z-50 max-w-xs rounded-lg bg-grey-black px-3 py-2 text-xs text-white shadow-lg animate-in fade-in-0 zoom-in-95"
                    >
                        {t('alpha.consentText')}
                        <Tooltip.Arrow className="fill-grey-black" />
                    </Tooltip.Content>
                </Tooltip.Portal>
            </Tooltip.Root>
        </Tooltip.Provider>
    );
}
