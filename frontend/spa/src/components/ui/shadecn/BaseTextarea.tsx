import * as React from 'react';

import { INPUT_SURFACE } from './inputStyles';

import { cn } from '@/lib/utils.ts';

/** Multi-line text field with the same look as BaseInput */
const BaseTextarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...props }, ref) => {
    return <textarea className={cn(INPUT_SURFACE, 'py-2', className)} ref={ref} {...props} />;
});
BaseTextarea.displayName = 'BaseTextarea';

export { BaseTextarea };
