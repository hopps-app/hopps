import { createPortal } from 'react-dom';

import Emoji from '@/components/ui/Emoji';

interface DragGhostOverlayProps {
    name: string;
    emoji: string;
    x: number;
    y: number;
    isValidTarget: boolean | null;
}

export function DragGhostOverlay({ name, emoji, x, y, isValidTarget }: DragGhostOverlayProps) {
    return createPortal(
        <div className="fixed z-[9999] pointer-events-none" style={{ transform: `translate(${x + 12}px, ${y + 12}px)`, top: 0, left: 0 }}>
            <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 shadow-lg border border-purple-300 max-w-[180px]">
                {emoji && (
                    <span className="text-lg flex-shrink-0">
                        <Emoji emoji={emoji} />
                    </span>
                )}
                <span className="text-sm font-semibold text-gray-800 truncate">{name}</span>
                {isValidTarget !== null && <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${isValidTarget ? 'bg-green-500' : 'bg-red-500'}`} />}
            </div>
        </div>,
        document.body
    );
}
