import * as _ from 'lodash';
import { useState } from 'react';

import { Label } from './Label.tsx';

import { BaseSelect, SelectItem, SelectContent, SelectTrigger, SelectValue, SelectGroup } from '@/components/ui/shadecn/BaseSelect.tsx';

export interface SelectItem {
    label: string;
    value: string | number;
}

interface SelectProps {
    value?: string;
    items: SelectItem[];
    onValueChanged?: (value: string) => void;
    label?: string;
    placeholder?: string;
    className?: string;
    error?: string;
    required?: boolean;
}

function Select(props: SelectProps) {
    const { value, items, onValueChanged, label, placeholder, className, error, required, ...otherProps } = props;
    const [id] = useState(_.uniqueId('select-'));
    const errorId = `${id}-error`;
    const [isOpened, setIsOpened] = useState(false);

    return (
        <div className={`grid w-full items-center gap-1.5 ${className}`}>
            {label && (
                <Label htmlFor={id} className={error ? 'text-red-500' : ''}>
                    {label}
                </Label>
            )}
            <BaseSelect name={id} value={value} onValueChange={(value: string) => onValueChanged?.(value)} onOpenChange={setIsOpened} {...otherProps}>
                <SelectTrigger
                    id={id}
                    className={`${isOpened ? ' rounded ring-2 ring-primary' : ''}${error ? ' border-red-500 focus:border-red-500 focus:ring-red-500 shadow-[0_0_0_2px_rgba(239,68,68,0.15)] text-red-500' : ''}`}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? errorId : undefined}
                    aria-required={required || undefined}
                >
                    <SelectValue placeholder={placeholder || 'Select'} className="placeholder:text-muted" />
                </SelectTrigger>
                <SelectContent>
                    <SelectGroup>
                        {items.map((item) => (
                            <SelectItem key={item.value} value={String(item.value)}>
                                {item.label}
                            </SelectItem>
                        ))}
                    </SelectGroup>
                </SelectContent>
            </BaseSelect>
            {error && (
                <p id={errorId} role="alert" className="text-xs text-red-500 mt-0.5 animate-in fade-in slide-in-from-top-1 duration-200">
                    {error}
                </p>
            )}
        </div>
    );
}

export default Select;
