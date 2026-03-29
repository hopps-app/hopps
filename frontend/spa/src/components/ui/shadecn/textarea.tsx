import * as React from 'react';

import { cn } from '@/lib/utils';

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<'textarea'>>(({ className, ...props }, ref) => {
    return (
        <textarea
            className={cn(
                'flex min-h-[80px] w-full bg-white dark:bg-[var(--purple-50)] rounded-xl border border-[#d1d5db] dark:border-gray-700 px-3 py-2 text-base text-gray-800 dark:text-gray-100 shadow-sm placeholder:text-muted-foreground',
                'focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary',
                'disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
                className
            )}
            ref={ref}
            {...props}
        />
    );
});
Textarea.displayName = 'Textarea';

export { Textarea };
