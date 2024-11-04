import { useState } from 'react';
import * as _ from 'lodash';

import { Label } from './Label.tsx';
import { BaseInput } from '@/components/ui/shadecn/BaseInput.tsx';

interface TextFieldProps {
    label?: string;
    placeholder?: string;
    type?: 'text' | 'password';
    name?: string;
    appendIcon?: string;
}

function TextField(props: TextFieldProps) {
    const { label, placeholder, type, name, appendIcon } = props;
    const [id] = useState(_.uniqueId('text-field-'));

    return (
        <div className="grid w-full max-w-sm items-center gap-1.5">
            {label && <Label htmlFor={id}>{label}</Label>}
            <div className="relative flex items-center">
                <BaseInput id={id} name={name || undefined} type={type || 'text'} placeholder={placeholder || ''} />
                {appendIcon || null}
            </div>
        </div>
    );
}

export default TextField;
