import type { ReactNode } from 'react';

import { FONT } from './layout';

/** Purple uppercase section label, optionally with a leading icon. */
export function Eyebrow({ icon, children, className }: { icon?: ReactNode; children: ReactNode; className?: string }) {
    return (
        <div
            className={`flex items-center gap-[7px] text-[12px] font-bold uppercase tracking-[0.07em] text-purple-700 ${className ?? ''}`}
            style={{ fontFamily: FONT }}
        >
            {icon}
            {children}
        </div>
    );
}
