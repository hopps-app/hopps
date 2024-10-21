import { Label } from './label';
import { Input } from '@/components/ui/Input.tsx';
import { useState } from 'react';
import * as _ from 'lodash';

interface TextFieldProps {
    label?: string;
    placeholder?: string;
    type?: string;
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
                <Input id={id} name={name || undefined} type={type || 'text'} placeholder={placeholder || ''} />
                {appendIcon || null}
            </div>
        </div>
    );
}

export default TextField;
