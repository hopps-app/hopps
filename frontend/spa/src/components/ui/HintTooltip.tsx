import { ReactNode } from 'react';

/**
 * Lightweight hover tooltip that also works around a *disabled* child (e.g. a greyed-out confirm button), because the
 * hover target is the wrapper, not the child — disabled elements emit no pointer events themselves. Renders nothing
 * extra when `content` is empty. Used to explain why an action is currently unavailable.
 */
export function HintTooltip({
    content,
    children,
    className,
    onMouseEnter,
    align = 'center',
}: {
    content: ReactNode;
    children: ReactNode;
    className?: string;
    onMouseEnter?: () => void;
    // 'end' anchors the bubble at the trigger's right edge, for triggers near the right border of a panel.
    align?: 'center' | 'end';
}) {
    return (
        <span className={`relative group inline-flex ${className ?? ''}`} onMouseEnter={onMouseEnter}>
            {children}
            {content && (
                // whitespace-normal: the trigger may sit in a nowrap label, and the text must still wrap.
                <span
                    className={`pointer-events-none absolute bottom-full mb-2 z-50 w-max max-w-[260px] whitespace-normal normal-case tracking-normal font-normal opacity-0 group-hover:opacity-100 transition-opacity duration-150 ${
                        align === 'end' ? 'right-0' : 'left-1/2 -translate-x-1/2'
                    }`}
                >
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
