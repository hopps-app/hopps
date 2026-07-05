import { ReactNode } from 'react';

/**
 * Lightweight hover tooltip that also works around a *disabled* child (e.g. a greyed-out confirm button), because the
 * hover target is the wrapper, not the child — disabled elements emit no pointer events themselves. Renders nothing
 * extra when `content` is empty. Used to explain why an action is currently unavailable.
 */
export function HintTooltip({ content, children, className }: { content: ReactNode; children: ReactNode; className?: string }) {
    return (
        <span className={`relative group inline-flex ${className ?? ''}`}>
            {children}
            {content && (
                <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-max max-w-[260px] opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                    <span
                        className="block rounded-[10px] px-3 py-2 text-[12px] leading-snug text-white shadow-lg"
                        style={{ background: '#1B1B1F', fontFamily: '"Hanken Grotesk", "Reddit Sans", sans-serif' }}
                    >
                        {content}
                    </span>
                </span>
            )}
        </span>
    );
}
