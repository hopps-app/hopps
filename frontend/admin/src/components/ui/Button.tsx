import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * The SPA's button (frontend/spa/src/components/ui/shadecn/BaseButton.tsx), with the same variants, sizes and look, so
 * the admin app's buttons match the main app. Colors come from the tokens at the top of styles/index.css.
 */
const BASE =
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[10px] text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--purple-300)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0';

const VARIANTS = {
    default: 'bg-[var(--purple-500)] text-white hover:bg-[var(--primary-active)]',
    destructive: 'bg-[var(--destructive)] text-[var(--destructive-foreground)] hover:bg-[var(--destructive)]/90',
    /** Not in the SPA: the first, reversible step of a delete. Mirrors .btn--danger from the design handoff. */
    'destructive-outline': 'bg-transparent text-neg-ink border border-[var(--neg)] hover:bg-neg-bg',
    secondary: 'bg-[var(--purple-100)] text-ink border border-[var(--purple-300)] hover:bg-[var(--purple-200)] hover:border-[var(--purple-400)]',
    outline:
        'text-[#666666] border border-[#CBC6D4] bg-surface shadow-[0_1px_2px_rgba(60,20,90,0.04),0_4px_12px_rgba(60,20,90,0.06)] hover:border-[var(--purple-500)] hover:text-[var(--purple-500)] hover:shadow-[0_2px_4px_rgba(60,20,90,0.06),0_8px_24px_rgba(60,20,90,0.10)]',
    link: 'text-[var(--purple-500)] underline-offset-4 hover:underline',
} as const;

const SIZES = {
    default: 'h-10 px-8',
    sm: 'h-9 px-4 text-sm',
    icon: 'h-9 w-9',
} as const;

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: keyof typeof VARIANTS;
    size?: keyof typeof SIZES;
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ variant = 'default', size = 'default', className, type = 'button', ...props }, ref) => (
    <button ref={ref} type={type} className={cn(BASE, VARIANTS[variant], SIZES[size], className)} {...props} />
));

Button.displayName = 'Button';

export default Button;
