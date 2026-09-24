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
    disabled?: boolean;
}

function Select(props: SelectProps) {
    const { value, items, onValueChanged, label, placeholder, className, error, required, disabled, ...otherProps } = props;
    const [id] = useState(_.uniqueId('select-'));
    const errorId = `${id}-error`;
    // Radix mirrors a programmatic `value` change into a hidden native <select> and reports the outcome through
    // onValueChange. When the matching <option> is not registered yet (e.g. right after react-hook-form's reset()),
    // the native select falls back to "" and Radix would clear the field. Items never carry an empty value, so an
    // empty string can only be that artefact and is ignored.
    const handleValueChange = (next: string) => {
        if (next === '') return;
        onValueChanged?.(next);
    };
    return (
        <div className={`grid w-full items-center gap-1.5 ${className}`}>
            {label && (
                <Label htmlFor={id} className={error ? 'text-red-500' : ''} required={required}>
                    {label}
                </Label>
            )}
            <BaseSelect name={id} value={value} onValueChange={handleValueChange} disabled={disabled} {...otherProps}>
                <SelectTrigger
                    id={id}
                    error={!!error}
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
