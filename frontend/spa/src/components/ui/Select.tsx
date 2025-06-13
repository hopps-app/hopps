import * as _ from 'lodash';
import { useState } from 'react';

import { BaseSelect, SelectItem, SelectContent, SelectTrigger, SelectValue, SelectGroup } from '@/components/ui/shadecn/BaseSelect.tsx';
import { Label } from './Label.tsx';

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
}

function Select(props: SelectProps) {
    const { value, error, items, onValueChanged, label, placeholder, className, ...otherProps } = props;
    const [id] = useState(_.uniqueId('select-'));
    const [isOpened, setIsOpened] = useState(false);

    return (
        <div className={`grid w-full items-center gap-1.5 ${className}`}>
            {label && <Label htmlFor={id}>{label}</Label>}
            <BaseSelect name={id} value={value} onValueChange={(value: string) => onValueChanged?.(value)} onOpenChange={setIsOpened} {...otherProps}>
                <SelectTrigger className={isOpened ? 'rounded ring-2 ring-primary' : 'rounded-md'}>
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
                <div className="absolute bottom-0 right-0 text-destructive text-xs px-4 translate-y-2.5">
                  {error}
                </div>
            )}
        </div>
    );
}

export default Select;
