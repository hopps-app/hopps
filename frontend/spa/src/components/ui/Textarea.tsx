import * as _ from 'lodash';
import * as React from 'react';
import { useState } from 'react';

import { Label } from './Label';

import { Textarea as TextareaBase } from '@/components/ui/shadecn/textarea'; // no .tsx needed
import { cn } from '@/lib/utils';

type TextareaProps = React.ComponentProps<'textarea'> & {
    label?: string;
    error?: string;
};

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ label, id: propId, error, className, ...props }, ref) => {
    const [generatedId] = useState(_.uniqueId('textarea-'));
    const id = propId || generatedId;
    const errorId = `${id}-error`;

    return (
        <div className="grid w-full items-center gap-1.5">
            {label && (
                <Label htmlFor={id} className={error ? 'text-red-500' : ''}>
                    {label}
                </Label>
            )}

            <TextareaBase
                id={id}
                ref={ref}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? errorId : undefined}
                className={cn(
                    error && 'border-red-500 focus:border-red-500 focus:ring-red-500 shadow-[0_0_0_2px_rgba(239,68,68,0.15)] text-red-500',
                    className
                )}
                {...props}
            />

            {error && (
                <p id={errorId} role="alert" className="text-xs text-red-500 mt-0.5 animate-in fade-in slide-in-from-top-1 duration-200">
                    {error}
                </p>
            )}
        </div>
    );
});

Textarea.displayName = 'Textarea';
export default Textarea;
