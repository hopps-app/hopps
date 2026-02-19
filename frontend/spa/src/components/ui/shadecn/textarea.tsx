import * as React from 'react';

import { cn } from '@/lib/utils';

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<'textarea'>>(({ className, ...props }, ref) => {
    return (
        <textarea
            className={cn(
                'flex min-h-[80px] w-full bg-primary-foreground rounded-[10px] border border-[#A7A7A7] px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground',
                'focus:border-primary focus:outline-none focus:border-[2px] focus-visible:ring-1 focus-visible:ring-primary',
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
