import * as Tooltip from '@radix-ui/react-tooltip';
import { Info } from 'lucide-react';

/** Info icon with a tooltip, styled like the collapsed sidebar's tooltips. Sits above drawers and modals (z-index 160). */
export default function InfoTip({ text, size = 14 }: { text: string; size?: number }) {
    return (
        <Tooltip.Provider delayDuration={0}>
            <Tooltip.Root>
                <Tooltip.Trigger asChild>
                    <span tabIndex={0} aria-label={text} className="text-ink-3 hover:text-ink-2 cursor-help" onClick={(e) => e.preventDefault()}>
                        <Info size={size} />
                    </span>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                    <Tooltip.Content
                        side="top"
                        sideOffset={6}
                        className="z-[200] max-w-[260px] rounded-md bg-grey-black px-2.5 py-1.5 text-xs font-medium text-white shadow-lg"
                    >
                        {text}
                        <Tooltip.Arrow className="fill-grey-black" />
                    </Tooltip.Content>
                </Tooltip.Portal>
            </Tooltip.Root>
        </Tooltip.Provider>
    );
}
