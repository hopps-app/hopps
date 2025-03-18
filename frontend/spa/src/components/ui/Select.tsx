import { useState } from 'react';
import * as _ from 'lodash';

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
}

function Select(props: SelectProps) {
    const { value, items, onValueChanged, label, placeholder, className, ...otherProps } = props;
    const [id] = useState(_.uniqueId('select-'));
    const [isOpened, setIsOpened] = useState(false);

    return (
        <div className={`grid w-full items-center gap-1.5 ${className}`}>
            {label && <Label htmlFor={id}>{label}</Label>}
            <BaseSelect name={id} value={value} onValueChange={(value: string) => onValueChanged?.(value)} onOpenChange={setIsOpened} {...otherProps}>
                <SelectTrigger className={isOpened ? ' rounded ring-2 ring-primary' : ''}>
                    <SelectValue placeholder={placeholder || 'Select'} className="placeholder:text-muted" />
                </SelectTrigger>
                <SelectContent>
                    <SelectGroup>
                        {items.map((item) => (
                            <SelectItem key={item.value} value={item.value}>
                                {' '}
                                {item.label}
                            </SelectItem>
                        ))}
                    </SelectGroup>
                </SelectContent>
            </BaseSelect>
        </div>
    );
}

export default Select;
